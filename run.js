const fetch = require("node-fetch");
const configs = require("./configs/config.json");
const ethers = require("ethers");
const wssUrl = configs["providerWssUrl"];
const provider = new ethers.providers.WebSocketProvider(wssUrl);
const fs = require("fs");

// 加载.env文件
const dotenv = require("dotenv");
dotenv.config();
const PK = process.env.PK;
const wallet = new ethers.Wallet(PK, provider);

const app = {
    data: {},
    contracts: {},
};
// 参数1：合约地址
// 参数2：0: test; 1: run

// 通过合约地址从配置文件里面加载合约的abi、合约的method、参数、value、gasLimit、maxGas、maxGasPriority

// 初始化合约

// test 就打印参数，run就调用执行

const fetchAbi = async (contractAddr) => {
    const apiKey = "3HEKTZ13QU9I3VZH4CNPDWDYFEPJ435CFN";
    const url =
        "https://api.etherscan.io/api?module=contract&action=getabi&address=" +
        contractAddr +
        "&apikey=" +
        apiKey;
    await fetch(url, {
        method: "GET",
        redirect: "follow",
        timeout: 10000,
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

const fetchMaxSupply = async (contract, abi) => {
    let maxSupply = ethers.BigNumber.from(0);
    if (abi.indexOf("MAX_SUPPLY") != -1) {
        maxSupply = await contract.MAX_SUPPLY();
    } else if (abi.indexOf("maxSupply") != -1) {
        maxSupply = await contract.maxSupply();
    }
    return maxSupply;
};

const fetchTxInfo = async (hash, abi) => {
    const tx = await provider.getTransaction(hash);
    const iface = new ethers.utils.Interface(abi);
    const functionName = iface.getFunction(tx.data.slice(0, 10)).name;
    const decodedArgs = iface.decodeFunctionData(tx.data.slice(0, 10), tx.data);
    let arrArgs = [];
    let mapArgs = {};
    for (let k in decodedArgs) {
        if (isInteger(k)) {
            arrArgs.push(decodedArgs[k]);
        } else {
            mapArgs[k] = decodedArgs[k];
        }
    }

    return {
        gasLimit: tx.gasLimit.toNumber(),
        maxPriorityFeePerGas: ethers.utils.formatUnits(
            tx.maxPriorityFeePerGas,
            "gwei"
        ),
        maxFeePerGas: ethers.utils.formatUnits(tx.maxFeePerGas, "gwei"),
        value: tx.value.toNumber(),
        functionName,
        arrArgs,
        mapArgs,
    };
};
const isInteger = (obj) => {
    return obj % 1 === 0;
};

const main = async () => {
    const contractAddr = "0x6Ae978e0C8466eB5371592b1870bACc36Bdbf163";
    // const contractAddr = "0xFEBe379C90052123D5cC2b8863496f902F9FA542";
    const hash =
        "0x081936c56e11a5310d163e2e34437de40f7c1d90e1883bf8411acb096b89e076";
    app.contracts[contractAddr] = {
        abi: "",
        maxSupply: 0,
        totalSupply: 0,
        txInfo: null,
    };

    try {
        // 获取contract的abi
        await fetchAbi(contractAddr);
        const abi = app.contracts[contractAddr].abi;
        // 初始化contract，获取maxSupply, totalSupply
        const contract = new ethers.Contract(contractAddr, abi, wallet);
        const maxSupply = await fetchMaxSupply(contract, abi);
        const totalSupply = await contract.totalSupply();
        app.contracts[contractAddr]["maxSupply"] = maxSupply.toNumber();
        app.contracts[contractAddr]["totalSupply"] = totalSupply.toNumber();

        // 获取tx细节
        app.contracts[contractAddr]["txInfo"] = await fetchTxInfo(hash, abi);

        // 用户的交易细节
    } catch (e) {
        console.log(e);
    }

    // write JSON string to a file
    const cfgFile = __dirname + `/configs/${contractAddr}.json`;
    if (fs.existsSync(cfgFile)) {
        fs.unlinkSync(cfgFile);
    }
    const cfg = JSON.stringify(app.contracts[contractAddr], null, 4);
    fs.writeFile(cfgFile, cfg, (err) => {
        if (err) {
            console.log(err);
        }
    });
};
main();
