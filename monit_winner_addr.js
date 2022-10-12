const { sleep } = require("./utills/utils");
const fetch = require("node-fetch");
const TelegramBot = require("node-telegram-bot-api");
const HttpsProxyAgent = require("https-proxy-agent");

const app = {
    data: {},
};

// 其他配置文件
const configs = require("./configs/config.json");

// etherscan api keys
const apiKeys = configs.apiKeys;

// proxies
const proxies = configs.proxies;
const proxyAuth = configs.proxyAuth;

// telegram token
const telegramToken = configs.telegramToken;
const channelId = configs.telegramChannelId;
const teleBot = new TelegramBot(telegramToken);

let retryNum = 0;
const maxRetryNum = configs.maxRetryNum;

let db;
const dbFile = __dirname + "/dbs/mint.db";
const initDb = async () => {
    console.log("Start initializing database.");
    const sqlite3 = require("sqlite3").verbose();
    const { open } = require("sqlite");
    db = await open({
        filename: dbFile,
        driver: sqlite3.Database,
    });
    console.log("Finish initializing database.");
};

const runSql = async (sql) => {
    db.run(sql, (err) => {
        if (null != err) {
            console.log(err);
            process.exit();
        }
    });
};

const loadWinners = async () => {
    const sql =
        "SELECT address, latest_blknum FROM tb_monitoring_address WHERE status=0 ORDER BY id ASC";
    const rows = await db.all(sql);
    const addrs = [];
    rows.map((row) => {
        addrs.push({
            addr: row.address,
            latest_blknum: row.latest_blknum,
        });
    });
    return addrs;
};

const monitorNFTTx = async (winner) => {
    app.data.hash = {};
    app.data.dataset = [];
    try {
        await fetchTokenNFTTx(winner);

        await findNewAction(winner);
        // 清空重试次数
        retryNum = 0;
    } catch (e) {
        retryNum++;
        if (retryNum > maxRetryNum) {
            // 报警

            process.exit();
        }
        await sleep(2000);
        console.log(e);
        console.log("exception retry");
        await monitorNFTTx(winner);
    }
};

const fetchTokenNFTTx = async (winner) => {
    // 获取请求用的key
    const index = Math.floor(Math.random() * apiKeys.length);
    const apiKey = apiKeys[index];

    // 获取请求用的代理
    const pindex = Math.floor(Math.random() * proxies.length);
    const proxy = proxies[pindex];
    const url =
        "https://api.etherscan.io/api/?module=account&action=tokennfttx&address=" +
        winner.addr +
        "&page=1&offset=50&sort=desc&apikey=" +
        apiKey;
    await fetch(url, {
        method: "GET",
        redirect: "follow",
        timeout: 10000,
        agent: new HttpsProxyAgent(
            `http://${proxyAuth.username}:${proxyAuth.password}@${proxy.ip}:${proxy.port}`
        ),
    })
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            // console.log(data);
            if (data["status"] != 1) {
                console.log("Connection Error");
            }

            data["result"].map((result) => {
                // 只留新的交易
                if (result.blockNumber <= winner.latest_blknum) {
                    return;
                }
                // 过滤掉ENS
                if (
                    result.contractAddress ==
                    "0x57f1887a8bf19b14fc0df6fd9b2acc9af147ea85"
                ) {
                    return;
                }

                if (app.data.hash.hasOwnProperty(result.hash)) {
                    app.data.hash[result.hash]["nft"].push(result);
                } else {
                    app.data.hash[result.hash] = {};
                    app.data.hash[result.hash]["nft"] = [];
                    app.data.hash[result.hash]["nft"].push(result);
                }
            });
        });
};

const findNewAction = async (winner) => {
    for (hash in app.data.hash) {
        const consumed = [];
        app.data.hash[hash]["nft"].map((nft) => {
            const concat_ = (
                nft.timeStamp +
                nft.from +
                nft.to +
                nft.tokenName +
                nft.tokenID
            ).toLowerCase();
            if (consumed.includes(concat_)) {
                nft["duplicate"] = true;
            } else {
                nft["duplicate"] = false;
                consumed.push(concat_);
            }
        });
    }

    for (hash in app.data.hash) {
        let obj = {};
        let type = "";
        const uniqueNfts = app.data.hash[hash]["nft"].filter((nft) => {
            return !nft["duplicate"];
        });
        uniqueNfts.map((nft) => {
            if (winner.addr == nft.to.toLowerCase()) {
                if (
                    nft.from.toLowerCase() ==
                    "0x0000000000000000000000000000000000000000"
                ) {
                    type = "Mint";
                } else if (nft.from.toLowerCase() != winner.addr) {
                    if (nft.gasUsed > 30000) {
                        type = "Mint";
                    } else {
                        type = "TransferIn";
                    }
                }
            } else if (winner.addr == nft.from.toLowerCase()) {
                if (
                    nft.to.toLowerCase() ==
                    "0x0000000000000000000000000000000000000000"
                ) {
                    type = "Burn";
                } else if (nft.to.toLowerCase() != winner.addr) {
                    if (nft.gasUsed > 30000) {
                        type = "Sell";
                    } else {
                        type = "TransferOut";
                    }
                }
            }

            obj = {
                blockNumber: nft["blockNumber"],
                hash: hash,
                transactionType: type,
                standard: "ERC721",
                addr: winner.addr,
                from: nft["from"],
                to: nft["to"],
                contractAddress: nft["contractAddress"],
                tokenID: nft["tokenID"],
                tokenName: nft["tokenName"],
            };
            app.data.dataset.push(obj);
        });
    }
    await sendAlarm();
};

const sendAlarm = async () => {
    let message = "";
    Promise.all(
        app.data.dataset.map(async (nft) => {
            message += `<a href="https://etherscan.io/address/${
                nft.addr
            }">${nft.addr.slice(
                -6
            )}</a> has new <a href="https://etherscan.io/tx/${
                nft.hash
            }">tx</a>, type=${
                nft.transactionType
            }, collection=<a href="https://etherscan.io/token/${
                nft.contractAddress
            }">${nft.tokenName} (${nft.contractAddress.slice(
                0,
                6
            )})</a>, tokenId=${nft.tokenID}\n`;
            // 更新lastest block number
            await runSql(
                `update tb_monitoring_address set latest_blknum=${nft.blockNumber} where address='${nft.addr}'`
            );
        })
    );
    if (message != "") {
        teleBot.sendMessage(channelId, message, {
            parse_mode: "HTML",
        });
    }
};

const main = async () => {
    await initDb();

    const winners = await loadWinners();
    // console.log(winners);

    // 遍历地址，计算地址盈亏
    for (let i = 0; i < winners.length; i++) {
        const winner = winners[i];
        console.log(`Start monitoring ${winner.addr}`);
        await monitorNFTTx(winner);
        console.log(`Finish monitoring ${winner.addr}`);
        await sleep(2000);
    }
};
main();
