// 设置白名单，将胜率高的地址添加到里面
// 监听他们mint的操作：如果包含mint就跟单，如果是其他方法就报警
const ethers = require("ethers");
const TelegramBot = require("node-telegram-bot-api");

const configs = require("./configs/config.json");

const wssUrl = configs["providerWssUrl"];
const flashbotUrl = configs["providerFlashbotUrl"];
const provider = new ethers.providers.WebSocketProvider(wssUrl);
const flashbotProvider = new ethers.providers.JsonRpcProvider(flashbotUrl);

// 加载.env文件
const dotenv = require("dotenv");
dotenv.config();
const PK = process.env.PK;
const wallet = new ethers.Wallet(PK, provider);
const walletFlashbot = new ethers.Wallet(PK, flashbotProvider);
// 每次跟单最多投入的eth数量
const maxEthPerMint = "0.001";
// 0xa0712d68: mint
const methods = ["0xa0712d68"];
const abis = {
    "0xa0712d68": [
        {
            inputs: [
                {
                    internalType: "uint256",
                    name: "_mintAmount",
                    type: "uint256",
                },
            ],
            name: "mint",
            outputs: [],
            stateMutability: "payable",
            type: "function",
        },
    ],
};

// telegram token
const telegramToken = configs.telegramToken;
const channelId = configs.telegramChannelId;
const teleBot = new TelegramBot(telegramToken);

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
let whitelist = [];
let baseFeePerGas = ethers.utils.parseUnits("5", "gwei"); // gwei
let maxFeePerGas = baseFeePerGas.mul(ethers.BigNumber.from(2)); // 2 * baseFeePerGas
const maxPriorityFeePerGas = ethers.utils.parseUnits(
    configs.maxPriorityFeePerGas,
    "gwei"
);

const loadWhitelist = async () => {
    const sql = "SELECT address FROM tb_monitoring_address";
    const rows = await db.all(sql);
    rows.map((row) => {
        whitelist.push(row.address);
    });
};

const parseAmount = (method, abi, data) => {
    let mintAmount = 0;
    switch (method) {
        case "0xa0712d68":
        default:
            const iface = new ethers.utils.Interface(abi);
            // const functionName = iface.getFunction(data.slice(0, 10)).name;
            const decodedArgs = iface.decodeFunctionData(
                data.slice(0, 10),
                data
            );
            mintAmount = decodedArgs[0].toNumber();
            break;
    }
    return mintAmount;
};

const lisenToMint = function () {
    provider.on("pending", async (tx) => {
        const transaction = await provider.getTransaction(tx);

        // 确保from 在白名单中
        const from = transaction["from"].toLocaleLowerCase();
        if (whitelist.indexOf(from) == -1) {
            return;
        }

        // 对比方法名，确保method是我们支持的
        for (let i = 0; i < methods.length; i++) {
            const method = methods[i];
            if (transaction["data"].indexOf(method) == -1) {
                continue;
            }

            // 方法名匹配， 获取执行参数，调用合约跟单
            const abi = abis[method];
            const contractAddress = transaction["to"];
            const mintAmount = parseAmount(method, abi, transaction["data"]);
            if (mintAmount == 0) {
                // 跳过错误的mintAmount
                console.log("mint amount 数量为0");
                return;
            }

            const value = transaction["value"];
            if (value.gt(ethers.utils.parseEther(maxEthPerMint))) {
                console.log(
                    `mint 总投入(${value.toNumber()}) > 单次投入上限(${maxEthPerMint})`
                );
                return;
            }

            // 调用合约
            const options = {
                value: value,
                maxPriorityFeePerGas: maxPriorityFeePerGas,
                maxFeePerGas: maxFeePerGas,
                gasLimit: transaction["gasLimit"],
            };

            const contract = new ethers.Contract(
                contractAddress,
                abi,
                walletFlashbot
            );
            const message = `<a href="https://etherscan.io/address/${contractAddress}">ethscan</a>, amount=${mintAmount}, value=${ethers.utils.formatEther(
                value
            )}, gasLimit=${transaction[
                "gaslimit"
            ].toNumber()}, maxFeePerGas=${ethers.utils.formatUnits(
                transaction["maxFeePerGas"],
                "gwei"
            )} (${ethers.utils.formatUnits(
                maxFeePerGas,
                "gwei"
            )}), maxPriorityFeePerGas=${ethers.utils.formatUnits(
                transaction["maxPriorityFeePerGas"],
                "gwei"
            )} (${ethers.utils.formatUnits(maxPriorityFeePerGas, "gwei")})`;
            teleBot.sendMessage(channelId, message, {
                parse_mode: "HTML",
            });
            // @记录已mint的项目，不要重复mint，用数据库记录，重启的时候先load出来
            // const tx = await contract.mint(mintAmount, options);
            // console.log(tx);
            // const receipt = await tx.wait();
            // console.log(receipt);
            break;
        }
    });

    provider.on("block", (block) => {
        provider.getBlock(block).then((data) => {
            baseFeePerGas = data["baseFeePerGas"];
            maxFeePerGas = baseFeePerGas.mul(13).div(10); // 1.3 * baseFeePerGas
            console.log(
                baseFeePerGas.toNumber(),
                maxFeePerGas.toNumber(),
                maxPriorityFeePerGas.toNumber()
            );
        });
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

const main = async () => {
    await initDb();
    // 加载白名单address
    await loadWhitelist();
    // 监听白名单
    lisenToMint();
};
main();
