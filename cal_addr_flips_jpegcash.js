// 数据库相关
const dbFile = __dirname + "/dbs/mint.db";
const { sleep } = require("./utills/utils");

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
    pricing: {},
    spam: [],
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

const runSql = async (sql) => {
    db.run(sql, (err) => {
        if (null != err) {
            console.log(err);
            process.exit();
        }
    });
};

const loadAddrs = async () => {
    const sql =
        "SELECT DISTINCT address FROM tb_collection_address WHERE status=0 ORDER BY id ASC";
    const rows = await db.all(sql);
    const addrs = [];
    rows.map((row) => {
        addrs.push(row.address);
    });
    return addrs;
};

const calProfit = async (addr) => {
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
    app.data.hash = {};
    app.data.nftTrader = [];
    app.data.dataset = [];
    app.data.latest = 1;
    app.data.staked = [];

    app.flips = {};

    // 获取["tokennfttx", "tokentx", "txlist", "txlistinternal"]相关数据，用来计算NFT的Flips
    if (!(await prepareData(addr))) {
        return false;
    }

    if (!(await finish(addr))) {
        return false;
    }
    return true;
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
    // console.log(url);
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
                const updateSql = `UPDATE tb_collection_address SET status=2 WHERE address='${addr}'`;
                console.log(updateSql);
                await runSql(updateSql);
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
    // console.log(url);
    await fetch(url)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            if (data["result"].length >= 10000) {
                console.log("Error, Too Many Results");
                const updateSql = `UPDATE tb_collection_address SET status=2 WHERE address='${addr}'`;
                console.log(updateSql);
                await runSql(updateSql);
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
    // console.log(url);
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
                const updateSql = `UPDATE tb_collection_address SET status=2 WHERE address='${addr}'`;
                console.log(updateSql);
                await runSql(updateSql);
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
                const updateSql = `UPDATE tb_collection_address SET status=2 WHERE address='${addr}'`;
                console.log(updateSql);
                await runSql(updateSql);
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

const getPricing = async () => {
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
                        valueFormatted: round(
                            nft["valCalc"] * weight,
                            app.settings.decimals
                        ),
                        gasPaid: nft["gasCalc"],
                        gasPaidFormatted: round(
                            nft["gasCalc"],
                            app.settings.decimals
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
                            nft["floorPrice"] = round(
                                floorPrice,
                                app.settings.decimals
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

    await outputStats(addr);
};

const outputStats = async (addr) => {
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
        sent: round(app.stats.sent, 3),
        received: round(app.stats.received, 3),
        gasPaid: round(app.stats.gas, 3),
        gasPaidOpen: round(app.stats.gasOpen, 3),
        sentOpen: round(app.stats.sentOpen, 3),
        valueOpen: round(app.stats.valueOpen, 3),

        nftTraderSent: round(app.stats.nftTraderSent, 3),
        nftTraderReceived: round(app.stats.nftTraderReceived, 3),
        nftTraderGasPaid: round(app.stats.nftTraderGas, 3),
        realizedWithFees: round(
            app.stats.received - app.stats.sent - app.stats.gas,
            3
        ),
        unrealizedWithFees: round(
            app.stats.valueOpen - app.stats.sentOpen - app.stats.gasOpen,
            3
        ),
        winningFlips,
        losingFilps,
    };

    console.log(stats);
    // 写入数据库
    const insertSql = `INSERT INTO tb_smart_address_flips_jc (address, sent, received, gas_paid, realized_with_fee, sent_open, value_open, gas_paid_open, unrealized_with_fee, winning_flips, losing_flips ) VALUES ('${addr}', ${stats.sent}, ${stats.received}, ${stats.gasPaid}, ${stats.realizedWithFees}, ${stats.sentOpen}, ${stats.valueOpen}, ${stats.gasPaidOpen}, ${stats.unrealizedWithFees}, ${stats.winningFlips}, ${stats.losingFilps})`;
    console.log(insertSql);
    console.log(await runSql(insertSql);

    // 更新地址状态
    const updateSql = `UPDATE tb_collection_address SET status=1 WHERE address='${addr}'`;
    console.log(updateSql);
    await runSql(updateSql);
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

const main = async () => {
    await initDb();

    // 获取地板价和spam的collection address
    if (!(await getPricing())) {
        return false;
    }

    // 获取地址的
    const addrs = await loadAddrs();
    // 遍历地址，计算地址盈亏
    for (let i = 0; i < 100; i++) {
        const addr = addrs[i];

        console.log("Starting calculate " + addr + "'s profit");
        await calProfit(addr);
        console.log("Finish calculate " + addr + "'s profit");
        await sleep(2000);
    }

    // const addr = "0xfc91e14a606cef9381c3f2761fafb613df5c2dcd";
    // console.log("Starting calculate " + addr + "'s profit");
    // await calProfit(addr);
    // console.log("Finish calculate " + addr + "'s profit");
};
main();
