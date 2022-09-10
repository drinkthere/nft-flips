const { sleep } = require("./utills/utils");
const fetch = require("node-fetch");
const app = {
    data: {},
};

// 其他配置文件
const configs = require("./configs/config.json");

const apiKeys = configs.apiKeys;

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

const updateStatus = async () => {
    // 设置所有地址的status=0，启动更新
    await runSql("update tb_monitoring_address set status=0");
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
    const url =
        "https://api.etherscan.io/api/?module=account&action=tokennfttx&address=" +
        winner.addr +
        "&page=1&offset=50&sort=desc&apikey=" +
        apiKey;
    await fetch(url)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            // console.log(data);
            if (data["status"] != 1) {
                console.log("Connection Error");
            }

            data["result"].map((result) => {
                if (result.blockNumber > winner.latest_blknum) {
                    if (app.data.hash.hasOwnProperty(result.hash)) {
                        app.data.hash[result.hash]["nft"].push(result);
                    } else {
                        app.data.hash[result.hash] = {};
                        app.data.hash[result.hash]["nft"] = [];
                        app.data.hash[result.hash]["nft"].push(result);
                    }
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
                    type = "TransferIn|Airdrop";
                }
            } else if (winner.addr == nft.from.toLowerCase()) {
                if (
                    nft.to.toLowerCase() ==
                    "0x0000000000000000000000000000000000000000"
                ) {
                    type = "Burn";
                } else if (nft.to.toLowerCase() != winner.addr) {
                    type = "TransferOut|Sell";
                }
            }

            obj = {
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
    app.data.dataset.map((nft) => {
        message += `${nft.addr} has new tx, type=${nft.transactionType}, collection=${nft.tokenName}, tokenId=${nft.tokenID}, hash=${nft.hash}\n`;
    });
    console.log(message);
};

const main = async () => {
    await initDb();

    await updateStatus();

    const winners = await loadWinners();
    // console.log(winners);

    // 遍历地址，计算地址盈亏
    for (let i = 0; i < winners.length; i++) {
        const winner = winners[i];
        await monitorNFTTx(winner);
        await sleep(2000);
    }
};
main();
