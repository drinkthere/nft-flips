// 数据库相关
const dbFile = __dirname + "/dbs/mint.db";
let db;

const app = {};

app.settings = {};
app.settings = {
    filters: {
        spam: false,
    },
    fx: "ETH",
    decimals: 4,
};

app.data = {
    hash: {},
    nftTrader: [],
    dataset: [],
    latest: 1,
    staked: [],
};

app.stats = {
    sent: 0,
    received: 0,
    gas: 0,
    realized: 0,
    sentOpen: 0,
    receivedOpen: 0,
    gasOpen: 0,
    valueOpen: 0,
    nftTraderSent: 0,
    nftTraderReceived: 0,
    nftTraderGas: 0,
};
app.flips = {};

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

const loadAddrs = async () => {
    const sql =
        "SELECT address FROM tb_collection_address WHERE status=0 ORDER BY id ASC";
    const rows = await db.all(sql);
    const addrs = [];
    rows.map((row) => {
        addrs.push(row.address);
    });
    return addrs;
};

const prepareData = async (addr) => {
    if (!(await fetchTokenNFTTx(addr))) {
        return false;
    }
    if (!(await fetchTokenTx(addr))) {
        return false;
    }
    if (!(await fetchTxList(addr))) {
        return false;
    }
    if (!(await fetchTxListInternal(addr))) {
        return false;
    }
    return true;
};

const fetchTokenNFTTx = async (addr) => {
    let ret = false;
    const url =
        "https://api.etherscan.io/api/?module=account&action=tokennfttx&address=" +
        addr +
        "&page=1&offset=10000&sort=desc&apikey=Y56BF6PXMUZPDGC82YX2SQK5HV7EMBG1B8";
    await fetch(url)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            if (data["status"] != 1) {
                console.log("Connection Error");
            }

            if (data["result"].length >= 10000) {
                console.log("Error, Too Many Results");
                return;
            }

            data["result"].map((result) => {
                if (app.data.hash.hasOwnProperty(result.hash)) {
                    app.data.hash[result.hash]["nft"].push(result);
                } else {
                    app.data.hash[result.hash] = {};
                    app.data.hash[result.hash]["nft"] = [];
                    app.data.hash[result.hash]["crypto"] = [];
                    app.data.hash[result.hash]["nft"].push(result);
                }
            });
            ret = true;
        });
    // console.log(app.data.hash);
    return ret;
};

const fetchTokenTx = async (addr) => {
    let ret = false;
    const url =
        "https://api.etherscan.io/api/?module=account&action=tokentx&address=" +
        addr +
        "&page=1&offset=10000&sort=desc&apikey=1764TRITEGDU1FQZG16B641C9CMBSNJB1Q";
    await fetch(url)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            if (data["result"].length >= 10000) {
                console.log("Error, Too Many Results");
                return ret;
            }
            if (data["result"].length == 0) {
                ret = true;
                return ret;
            }

            data["result"].map((result) => {
                if (
                    // NFT Trader issue
                    result.to.toLowerCase() ==
                        "0xC310e760778ECBca4C65B6C559874757A4c4Ece0".toLowerCase() ||
                    result.from.toLowerCase() ==
                        "0xC310e760778ECBca4C65B6C559874757A4c4Ece0".toLowerCase()
                ) {
                    if (!Number(result.isError)) {
                        app.data.nftTrader.push(result);
                    }
                }

                if (app.data.hash.hasOwnProperty(result.hash)) {
                    app.data.hash[result.hash]["crypto"].push(result);
                } else {
                    app.data.hash[result.hash] = {};
                    app.data.hash[result.hash]["nft"] = [];
                    app.data.hash[result.hash]["crypto"] = [];
                    app.data.hash[result.hash]["crypto"].push(result);
                }
                ret = true;
            });
        });
    // console.log(app.data.hash);
    return ret;
};

const fetchTxList = async (addr) => {
    let ret = false;
    //   const url =
    //     "https://jpeg.cash/api/etherscan?address=" + addr + "&action=txlist";
    const url =
        "https://api.etherscan.io/api/?module=account&action=txlist&address=" +
        addr +
        "&page=1&offset=10000&sort=desc&apikey=RTIPWA3QRYYUEVGA9VN57V6UUG571RV3TB";
    console.log(url);
    await fetch(url)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            //   results = JSON.parse(data["data"]);
            //   console.log(results["result"].length);
            //   process.exit();
            if (data["status"] != 1) {
                console.log("Connection Error");
            }
            //   console.log(data["result"].length);
            //   process.exit();
            if (data["result"].length >= 10000) {
                console.log("Error, Too Many Results");
                return;
            }

            data["result"].map((result) => {
                if (
                    // NFT Trader issue
                    result.to.toLowerCase() ==
                        "0xC310e760778ECBca4C65B6C559874757A4c4Ece0".toLowerCase() ||
                    result.from.toLowerCase() ==
                        "0xC310e760778ECBca4C65B6C559874757A4c4Ece0".toLowerCase()
                ) {
                    if (!Number(result.isError)) {
                        app.data.nftTrader.push(result);
                    }
                }

                if (app.data.hash.hasOwnProperty(result.hash)) {
                    app.data.hash[result.hash]["crypto"].push(result);
                } else {
                    app.data.hash[result.hash] = {};
                    app.data.hash[result.hash]["nft"] = [];
                    app.data.hash[result.hash]["crypto"] = [];
                    app.data.hash[result.hash]["crypto"].push(result);
                }
            });
            ret = true;
        });
    // console.log(app.data.hash);
    return ret;
};

const fetchTxListInternal = async (addr) => {
    let ret = false;
    const url =
        "https://api.etherscan.io/api/?module=account&action=txlistinternal&address=" +
        addr +
        "&page=1&offset=10000&sort=desc&apikey=8DRIPRJBDSQQ3HVS5F3GUU7YFVCMC3R68M";
    await fetch(url)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            if (data["status"] != 1) {
                console.log("Connection Error");
            }
            if (data["result"].length >= 10000) {
                console.log("Error, Too Many Results");
                return;
            }

            data["result"].map((result) => {
                if (
                    // NFT Trader issue
                    result.to.toLowerCase() ==
                        "0xC310e760778ECBca4C65B6C559874757A4c4Ece0".toLowerCase() ||
                    result.from.toLowerCase() ==
                        "0xC310e760778ECBca4C65B6C559874757A4c4Ece0".toLowerCase()
                ) {
                    if (!Number(result.isError)) {
                        app.data.nftTrader.push(result);
                    }
                }

                if (app.data.hash.hasOwnProperty(result.hash)) {
                    app.data.hash[result.hash]["crypto"].push(result);
                } else {
                    app.data.hash[result.hash] = {};
                    app.data.hash[result.hash]["nft"] = [];
                    app.data.hash[result.hash]["crypto"] = [];
                    app.data.hash[result.hash]["crypto"].push(result);
                }
                ret = true;
            });
        });
    // console.log(app.data.hash);
    return ret;
};

const getPricing = async (addr) => {
    const url = "https://jpeg.cash/api/pricing?id=XUEKO-XHDKE-HIGHE";
    let ret = false;
    await fetch(url)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            // @todo 从os或者其他平台的接口中拿nft的floor price
            app.data.pricing = data["data"];
            // @todo 从数据库里面初始化
            app.data.spam = data["spam"];
            ret = true;
        });
    return ret;
};

const finish = async (addr) => {
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
            // 带时间戳也会重复吗？
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
        const uniqueNfts = app.data.hash[hash]["nft"].filter((nft) => {
            return !nft["duplicate"];
        });
        const uniqueCryptos = app.data.hash[hash]["crypto"];
        uniqueNfts.map((nft) => {
            //flow of nft
            switch (true) {
                case addr != nft.to.toLowerCase() &&
                    addr == nft.from.toLowerCase():
                    nft["nftInOut"] = "out";
                    break;
                case addr == nft.to.toLowerCase() &&
                    addr != nft.from.toLowerCase():
                    nft["nftInOut"] = "in";
                    break;
                case addr == nft.to.toLowerCase() &&
                    addr == nft.from.toLowerCase():
                    nft["nftInOut"] = "interco";
                    break;
            }

            // airdrops
            if (uniqueCryptos.length == 0) {
                curDate = getDate(nft["timeStamp"]);
                obj = {
                    hash,
                    nftInOut: nft["nftInOut"],
                    cryptoInOut: "Send",
                    value: "0.00",
                    gasPaid: "0.00",
                    valueFormatted: "0.00",
                    gasPaidFormatted: "0.00",
                    standard: "ERC721",
                    position: "Open",
                    flag: app.data.spam.includes(nft["contractAddress"])
                        ? "spam"
                        : "",
                    transaction: "Airdrop",
                    floorPrice: "0.00",
                    to: nft["to"],
                    from: nft["from"],
                    contractAddress: nft["contractAddress"],
                    tokenID: nft["tokenID"],
                    tokenName: nft["tokenName"],
                    tokenSymbol: "ETH",
                    timeStamp: getDate(nft["timeStamp"]),
                };
                if (
                    !app.settings.filters.spam ||
                    (app.settings.filters.spam &&
                        !app.data.spam.includes(nft["contractAddress"]))
                ) {
                    app.data.dataset.push(obj);
                }
            } else {
                let gasFlag = 1;
                uniqueCryptos.map((crypto) => {
                    nft["gasCalc"] =
                        ((Number(crypto.gasPrice || 0) *
                            Number(crypto.gasUsed || 0)) /
                            uniqueNfts.length /
                            1e18) *
                        gasFlag;
                    if (gasFlag) {
                        gasFlag = 0;
                    }
                    nft["valCalc"] =
                        Number(crypto.value || 0) / uniqueNfts.length / 1e18;

                    switch (true) {
                        case addr != crypto.to.toLowerCase() &&
                            addr == crypto.from.toLowerCase():
                            nft["cryptoInOut"] = "out";
                            break;
                        case addr == crypto.to.toLowerCase() &&
                            addr != crypto.from.toLowerCase():
                            nft["cryptoInOut"] = "in";
                            break;
                        case addr == crypto.to.toLowerCase() &&
                            addr == crypto.from.toLowerCase():
                            nft["cryptoInOut"] = "interco";
                            break;
                    }
                    let weight = 0;
                    let type = "Unknown";
                    switch (true) {
                        case nft["gasCalc"] > 0 && nft["valCalc"] == 0:
                            type = "GasOnly";
                            weight = 1;
                            break;
                        case nft["nftInOut"] == "interco":
                            type = "Transfer";
                            weight = 1;
                            break;
                        case nft["cryptoInOut"] == "in":
                            type = "Receive";
                            weight = 1;
                            break;
                        case nft["cryptoInOut"] == "out":
                            type = "Send";
                            weight = -1;
                            break;
                    }

                    curDate = getDate(nft["timeStamp"]);

                    obj = {
                        hash: hash,
                        nftInOut: nft["nftInOut"],
                        cryptoInOut: nft["cryptoInOut"],
                        value: nft["valCalc"] * weight,
                        valueFormatted: commas(
                            round(
                                nft["valCalc"] * weight,
                                app.settings.decimals
                            )
                        ),
                        gasPaid: nft["gasCalc"],
                        gasPaidFormatted: commas(
                            round(nft["gasCalc"], app.settings.decimals)
                        ),
                        standard: "ERC721",
                        position: "Open",
                        transaction: type,
                        flag: app.data.spam.includes(nft["contractAddress"])
                            ? "spam"
                            : "",
                        to: nft["to"],
                        from: nft["from"],
                        floorPrice: "0.00",
                        contractAddress: nft["contractAddress"],
                        tokenID: nft["tokenID"],
                        tokenName: nft["tokenName"],
                        tokenSymbol: crypto["tokenSymbol"] || "ETH",
                        timeStamp: getDate(nft["timeStamp"]),
                    };
                    if (
                        obj["tokenSymbol"] == "ETH" ||
                        obj["tokenSymbol"] == "WETH"
                    ) {
                        if (
                            !app.settings.filters.spam ||
                            (app.settings.filters.spam &&
                                !app.data.spam.includes(nft["contractAddress"]))
                        ) {
                            app.data.dataset.push(obj);
                        }
                    }
                });
            }
        });
    }

    let positionObj = {};
    app.data.dataset.map((nft) => {
        // @todo 看下如何能把staking的nft也算成open，
        concat_ = nft["contractAddress"] + "-" + nft["tokenID"];
        if (positionObj.hasOwnProperty(concat_)) {
            switch (true) {
                case app.data.staked.includes(nft["to"].toLowerCase()) ||
                    app.data.staked.includes(nft["from"].toLowerCase()):
                    positionObj[concat_] = "Open";
                    nft["transaction"] = "Staking";
                    break;
                case nft["nftInOut"] == "out":
                    positionObj[concat_] = "Closed";
                    break;
            }
        } else {
            switch (true) {
                case app.data.staked.includes(nft["to"].toLowerCase()) ||
                    app.data.staked.includes(nft["from"].toLowerCase()):
                    positionObj[concat_] = "Open";
                    nft["transaction"] = "Staking";
                    break;
                case nft["nftInOut"] == "in":
                    positionObj[concat_] = "Open";
                    break;
                case nft["nftInOut"] == "out":
                    positionObj[concat_] = "Closed";
                    break;
            }
        }
    });

    const floorUsed = [];
    app.data.dataset.map((nft) => {
        concat_ = nft["contractAddress"] + "-" + nft["tokenID"];
        switch (positionObj[concat_]) {
            case "Closed":
                if (!app.flips.hasOwnProperty(concat_)) {
                    app.flips[concat_] = {
                        send: 0,
                        receive: 0,
                    };
                }
                if (
                    nft["tokenSymbol"] == "ETH" ||
                    nft["tokenSymbol"] == "WETH"
                ) {
                    nft["position"] = "Closed";
                    switch (nft["transaction"]) {
                        case "Send":
                            app.stats.sent += Math.abs(nft["value"]);
                            app.stats.gas += nft["gasPaid"];
                            app.flips[concat_]["send"] =
                                Math.abs(nft["value"]) + nft["gasPaid"];
                            break;
                        case "Receive":
                            app.stats.received += Math.abs(nft["value"]);
                            app.stats.gas += nft["gasPaid"];
                            app.flips[concat_]["receive"] = Math.abs(
                                nft["value"]
                            );
                            break;
                        case "GasOnly":
                            app.stats.gas += nft["gasPaid"];
                            app.flips[concat_]["send"] = nft["gasPaid"];
                            break;
                    }
                }
                break;
            case "Open":
                if (
                    nft["tokenSymbol"] == "ETH" ||
                    nft["tokenSymbol"] == "WETH"
                ) {
                    if (!floorUsed.includes(concat_)) {
                        if (
                            app.data.pricing.hasOwnProperty(
                                nft["contractAddress"]
                            )
                        ) {
                            floorPrice =
                                app.data.pricing[nft["contractAddress"]][
                                    "floor_price"
                                ];
                            nft["floorPrice"] = commas(
                                round(floorPrice, app.settings.decimals)
                            );
                            floorUsed.push(concat_);
                        } else {
                            floorPrice = 0;
                        }
                    } else {
                        floorPrice = 0;
                    }

                    switch (nft["transaction"]) {
                        case "Staking":
                            app.stats.gasOpen += nft["gasPaid"];
                            app.stats.valueOpen += floorPrice;
                            break;
                        case "Send":
                            app.stats.sentOpen += Math.abs(nft["value"]);
                            app.stats.gasOpen += nft["gasPaid"];
                            app.stats.valueOpen += floorPrice;
                            break;
                        case "Receive":
                            app.stats.sentOpen -= Math.abs(nft["value"]);
                            app.stats.gasOpen += nft["gasPaid"];
                            app.stats.valueOpen += floorPrice;
                            break;
                        case "GasOnly":
                            app.stats.gasOpen += nft["gasPaid"];
                            app.stats.valueOpen += floorPrice;
                            break;
                        case "Airdrop":
                            app.stats.valueOpen += floorPrice;
                            break;
                    }
                }
                break;
        }
    });

    outputStats();
};

const outputStats = () => {
    // 计算输赢次数
    let winningFlips = 0;
    let losingFilps = 0;
    for (let k in app.flips) {
        const flip = app.flips[k];
        if (flip["receive"] > 0 && flip["send"] > 0) {
            if (flip["receive"] - flip["send"] > 0) {
                winningFlips++;
            } else if (flip["receive"] - flip["send"] < 0) {
                losingFilps++;
            }
        }
    }

    const stats = {
        sent: commas(round(app.stats.sent, 3)),
        received: commas(round(app.stats.received, 3)),
        gasPaid: commas(round(app.stats.gas, 3)),
        gasPaidOpen: commas(round(app.stats.gasOpen, 3)),
        sentOpen: commas(round(app.stats.sentOpen, 3)),
        valueOpen: commas(round(app.stats.valueOpen, 3)),

        nftTraderSent: commas(round(app.stats.nftTraderSent, 3)),
        nftTraderReceived: commas(round(app.stats.nftTraderReceived, 3)),
        nftTraderGasPaid: commas(round(app.stats.nftTraderGas, 3)),
        realizedWithFees: commas(
            round(app.stats.received - app.stats.sent - app.stats.gas, 3)
        ),
        unrealizedWithFees: commas(
            round(
                app.stats.valueOpen - app.stats.sentOpen - app.stats.gasOpen,
                3
            )
        ),
        winningFlips,
        losingFilps,
    };

    console.log(stats);
};

const getDate = (timeStamp) => {
    if (!timeStamp) return "";
    var a = new Date(timeStamp * 1000);

    var year = a.getFullYear();
    var month = a.getMonth() + 1;
    var date = a.getDate();

    var date_ =
        year +
        "-" +
        (month.toString().length == 1 ? "0" + month : month) +
        "-" +
        (date.toString().length == 1 ? "0" + date : date);
    return date_;
};

const round = function (value, precision) {
    if (!value) return 0;
    var multiplier = Math.pow(10, precision || 0);
    var result = (Math.round(value * multiplier) / multiplier).toString();
    var decimalIndex = result.search(/[.]/g);
    if (result.search(/[.]/g) == -1) {
        result += "." + "0".repeat(precision);
        if (precision == 0) {
            result = result.replace(".", "");
        }
    } else {
        length = result.length;
        decimalPos = result.indexOf(".") + 1;
        result += "0".repeat(precision - (length - decimalPos));
    }
    return result;
};

commas = function (var_) {
    if (!var_) {
        return "0.00";
    }
    number_ = var_.toString().split(".")[0];
    decimals_ = var_.toString().split(".")[1] || "00";
    if (number_.toString().search("-") > -1) {
        var neg = "-";
    } else {
        var neg = "";
    }
    num = number_.toString().replace("-", "");
    switch (num.length) {
        case 4:
            number_ = neg + num.slice(0, 1) + "," + num.slice(1, 4);
            break;
        //console.log(number_)
        case 5:
            number_ = neg + num.slice(0, 2) + "," + num.slice(2, 5);
            break;
        case 6:
            number_ = neg + num.slice(0, 3) + "," + num.slice(3, 6);
            break;
        case 7:
            number_ =
                neg +
                num.slice(0, 1) +
                "," +
                num.slice(1, 4) +
                "," +
                num.slice(4, 7);
            break;
        case 8:
            number_ =
                neg +
                num.slice(0, 2) +
                "," +
                num.slice(2, 5) +
                "," +
                num.slice(5, 8);
            break;
        case 9:
            number_ =
                neg +
                num.slice(0, 3) +
                "," +
                num.slice(3, 6) +
                "," +
                num.slice(6, 9);
            break;
        case 10:
            number_ =
                neg +
                num.slice(0, 1) +
                "," +
                num.slice(1, 4) +
                "," +
                num.slice(4, 7) +
                "," +
                num.slice(7, 10);
            break;
        case 11:
            number_ =
                neg +
                num.slice(0, 2) +
                "," +
                num.slice(2, 5) +
                "," +
                num.slice(5, 8) +
                "," +
                num.slice(8, 11);
            break;
        case 12:
            number_ =
                neg +
                num.slice(0, 3) +
                "," +
                num.slice(3, 6) +
                "," +
                num.slice(6, 9) +
                "," +
                num.slice(9, 12);
            break;
        case 13:
            number_ =
                neg +
                num.slice(0, 1) +
                "," +
                num.slice(1, 4) +
                "," +
                num.slice(4, 7) +
                "," +
                num.slice(7, 10) +
                "," +
                num.slice(10, 13);
            break;
    }
    return number_ + "." + decimals_;
};

const main = async () => {
    await initDb();

    // 获取地址的
    const addrs = await loadAddrs();
    console.log(addrs);
    process.exit();

    // 循环获取每个地址的胜率信息

    const addr = "0x8bcfc7a0990d3853daa69018a8e9471e0757385c".toLowerCase();
    // 获取["tokennfttx", "tokentx", "txlist", "txlistinternal"]相关数据，用来计算NFT的Flips
    if (!(await prepareData(addr))) {
        return false;
    }
    // console.log(app.data.hash);

    if (!(await getPricing(addr))) {
        return false;
    }
    // console.log(app.data.spam, app.data.pricing);

    if (!(await finish(addr))) {
        return false;
    }
};
main();
