// 设置白名单，将胜率高的地址添加到里面
// 监听他们mint的操作：如果包含mint就跟单，如果是其他方法就报警
// const Web3 = requrie("web3");
// const { OpenSeaSDK, Network } = requrie("opensea-js");

// console.log(OpenSeaSDK, Network);
const Web3 = require("web3");
const opensea = require("opensea-js");
console.log(opensea);
process.exit();

const configs = require("./configs/config.json");
const wssUrl = configs["providerWssUrl"];
const provider = new ethers.providers.WebSocketProvider(wssUrl);

const openseaSDK = new OpenSeaSDK(provider, {
    networkName: Network.Main,
    apiKey: YOUR_API_KEY,
});

// 加载.env文件
const dotenv = require("dotenv");
dotenv.config();
const PK = process.env.PK;
const wallet = new ethers.Wallet(PK, provider);
const walletFlashbot = new ethers.Wallet(PK, flashbotProvider);
