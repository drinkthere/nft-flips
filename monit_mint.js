// 设置白名单，将胜率高的地址添加到里面
// 监听他们mint的操作：如果包含mint就跟单，如果是其他方法就报警
const ethers = require("ethers");
const TelegramBot = require("node-telegram-bot-api");
const HttpsProxyAgent = require("https-proxy-agent");
const fetch = require("node-fetch");
const fs = require("fs");
const log = require("./utils/log.js");

// 加载配置文件
const configs = require("./configs/config.json");

// etherscan api keys
const apiKeys = configs.apiKeys;

// proxies
const proxies = configs.proxies;
const proxyAuth = configs.proxyAuth;

// ether providers and signer
const wssUrl = configs["providerWssUrl"];
const provider = new ethers.providers.WebSocketProvider(wssUrl);

// @todo 自动跟单
// // 加载.env文件
// const dotenv = require("dotenv");
// dotenv.config();
// const PK = process.env.PK;
// const wallet = new ethers.Wallet(PK, provider);

// telegram token
const telegramToken = configs.telegramToken;
const channelId = configs.telegramChannelId;
const teleBot = new TelegramBot(telegramToken);

const dbFile = __dirname + "/dbs/mint.db";
const logFile = __dirname + "/logs/monit_method_args.log";

// 其他全局变量
const app = {
    db: null,
    winners: [],
    contracts: {},
};

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
const loadWinnerList = async () => {
    const sql = "SELECT address FROM tb_winner_address where status=1";
    const rows = await db.all(sql);
    rows.map((row) => {
        app.winners.push(row.address);
    });
};

const lisenToMint = function () {
    provider.on("pending", async (tx) => {
        const transaction = await provider.getTransaction(tx);
        if (!transaction) {
            return;
        }

        // 确保user 在白名单中
        const user = transaction["from"].toLocaleLowerCase();
        if (app.winners.indexOf(user) == -1) {
            return;
        }

        // 确保gas > 50000, 如果 < 50000 可能是transfer或者setApprovalForAll操作，这个后续我们再针对性处理
        if (transaction.gasLimit.toNumber() < 50000) {
            return;
        }

        // 解析合约的方法和参数： 获取ABI，解析参数
        const contractAddress = transaction.to;
        await fetchAbi(contractAddress);
        const abi = app.contracts[contractAddress].abi;

        const iface = new ethers.utils.Interface(abi);
        const decodedData = iface.parseTransaction({
            data: transaction.data,
            value: transaction.value,
        });
        if (decodedData == null) {
            return;
        }

        const isPayable = decodedData.functionFragment.payable;
        const method = decodedData.name;
        const value = decodedData.value;
        const gasLimit = transaction.gasLimit;
        const params = decodedData.args;

        // // @todo 如果是payable的，需要关注value值，确认是否是freemint的
        // if (!isPayable) {
        //     return;
        // }

        // @todo 对method进行积累，整理出来能cover 80%以上的map，确认方法名和参数，以便后续能够直接抢跑或者跟单
        // if (covered(method, params)) {
        //     // 抢单 | 跟单
        // }
        const message = `user=<a href="https://etherscan.io/address/${user}">${user.slice(
            -6
        )}</a>, contract=<a href="https://etherscan.io/address/${contractAddress}">${contractAddress.slice(
            -6
        )}</a>, tx=<a href="<a href="https://etherscan.io/tx/${tx}">tx</a>, method=${method}, value=${ethers.utils.formatEther(
            value
        )}, gasLimit=${gasLimit}`;
        teleBot.sendMessage(channelId, message, {
            parse_mode: "HTML",
        });

        log.info(
            logFile,
            `${user}|${contractAddr}|${method}|${ethers.utils.formatEther(
                value
            )}|${JSON.stringify(params)}`
        );
    });

    provider.on("block", (block) => {
        console.log(block);
        //     provider.getBlock(block).then((data) => {
        //         baseFeePerGas = data["baseFeePerGas"];
        //         maxFeePerGas = baseFeePerGas.mul(13).div(10); // 1.3 * baseFeePerGas
        //         console.log(
        //             block,
        //             baseFeePerGas.toNumber(),
        //             maxFeePerGas.toNumber(),
        //             maxPriorityFeePerGas.toNumber()
        //         );
        //     });
    });

    provider._websocket.on("open", async () => {
        console.log(`已链接到provider`);
    });

    provider._websocket.on("error", async (event) => {
        console.log(`链接发生错误，3s后重连，错误原因：${event}`);
        setTimeout(lisenToMint, 3000);
    });
    provider._websocket.on("close", async (event) => {
        console.log(`链接断开，原因：${event}。 3s后重连`);
        provider._websocket.terminate();
        setTimeout(lisenToMint, 3000);
    });
};

const fetchAbi = async (contractAddr) => {
    // 如果已经存在直接返回
    if (app.contracts.hasOwnProperty(contractAddr)) {
        return;
    }

    // 获取请求用的key
    const index = Math.floor(Math.random() * apiKeys.length);
    const apiKey = apiKeys[index];

    // 获取请求用的代理
    const pindex = Math.floor(Math.random() * proxies.length);
    const proxy = proxies[pindex];

    const url =
        "https://api.etherscan.io/api?module=contract&action=getabi&address=" +
        contractAddr +
        "&apikey=" +
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
            if (data["status"] != 1) {
                console.log("Connection Error");
            }
            app.contracts[contractAddr] = {
                abi: data["result"],
            };
        });
};

const main = async () => {
    await initDb();

    // 加载白名单address
    await loadWinnerList();

    // 监听地址动作
    lisenToMint();
};
main();
