app = {};
app.api = {};
app.run = false;
app.settings = {};
app.settings.warning = false;
app.settings.filters = {
    spam: true,
};

app.etherscan = () => {
    if ($("#run-button").hasClass("disabled")) {
        return;
    } else {
        $("#run-button").addClass("disabled");
        $("#run-button").html("Running ...");
    }
    // reset validation
    app.api.valid = true;

    // get addresses
    addresses = $(".addresses")
        .val()
        .replace(/ /g, "")
        .replace(/"/g, "")
        .replace(/\n/g, "")
        .split(",");

    // check for blank addresses
    if (!$(".addresses").val()) {
        $(".message-error").html(
            "Please enter at least one ethereum address to continue ... "
        );
        $(".message-error").show();
        $("#run-button").removeClass("disabled");
        $("#run-button").html("Run");
        return;
    }

    // test each address through regex
    addresses.map((address) => {
        const regexp = /^0x[a-fA-F0-9]{40}$/g;
        if (!address.toString().match(regexp)) {
            app.api.valid = false;
        }
    });

    let unique = [...new Set(addresses)];

    if (unique.length !== addresses.length) {
        $(".message-error").html(
            "One or more address are duplicated. Please enter unique addresses."
        );
        $(".message-error").show();
        $("#run-button").removeClass("disabled");
        $("#run-button").html("Run");
        return;
    }
    // if all addresses are ok, proceed, else return
    if (!app.api.valid) {
        $(".message-error").html(
            "One or more address is invalid. Please enter valid ethereum addresses separated by a comma. "
        );
        $(".message-error").show();
        $("#run-button").removeClass("disabled");
        $("#run-button").html("Run");
        return;
    }

    // begin calls
    $(".message").html("Calling api.etherscan.io ... ");
    $(".message-error").hide();
    $(".message").show();

    // set up call stack and call tracker
    app.api.stack = [];
    app.api.called = [];

    // set up data structure
    app.data = {
        hash: {},
        nftTrader: [],
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

    $("#tableholder").html("");

    let endPoints = ["tokennfttx", "tokentx", "txlist", "txlistinternal"];
    app.api.endPointNames = {
        tokennfttx: "ERC721 Tokens",
        tokentx: "ERC20 Tokens",
        txlist: "Normal Transactions",
        txlistinternal: "Internal Transactions",
    };

    app.data.addresses = [];

    addresses.map((address) => {
        app.data.addresses.push(address.toLowerCase());
    });

    addresses.map((address) => {
        endPoints.map((endpoint) => {
            app.api.stack.push(address.toLowerCase() + "-" + endpoint);
        });
    });

    app.api.fetch(app.api.stack[0]);
    $(".message").append(
        app.api.stack.length +
            " calls<br><br>--------------------------------------<br>"
    );
};

app.api.fetch = (call) => {
    let origin = window.location.origin;

    url =
        origin +
        "/api/etherscan?address=" +
        call.split("-")[0] +
        "&action=" +
        call.split("-")[1];

    fetch(url)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            if (!data["data"]) {
                $(".message").append(
                    "<br>" +
                        data["called"].split("-")[0].substring(0, 6) +
                        "..." +
                        data["called"].split("-")[0].substring(38, 42) +
                        " ----- " +
                        app.api.endPointNames[data["called"].split("-")[1]] +
                        "<span class='error-red'> ----- Connection Error, Please Try Again.  ----- </span>" +
                        " <br><br>" +
                        "--------------------------------------<br><br><br>" +
                        "<span class='operationCancelled'>Operation Cancelled</span>"
                );
                $("#run-button").removeClass("disabled");
                $("#run-button").html("Run");
                return;
            }

            results = JSON.parse(data["data"]);
            //console.log(results);

            if (results["result"].length >= 10000) {
                $(".message").append(
                    "<br>" +
                        data["called"].split("-")[0].substring(0, 6) +
                        "..." +
                        data["called"].split("-")[0].substring(38, 42) +
                        " ----- " +
                        app.api.endPointNames[data["called"].split("-")[1]] +
                        "<span class='error-red'> ----- Error, Too Many Results  ----- </span>" +
                        " <br><br>" +
                        "--------------------------------------<br><br><br>" +
                        "<span class='operationCancelled'>Operation Cancelled</span>"
                );
                return;
            }

            // this only added called data to stack if message isn't 'NOTOK'
            if (results["message"] != "NOTOK") {
                app.api.called.push(data["called"]);

                $(".message").append(
                    "<br>" +
                        data["called"].split("-")[0].substring(0, 6) +
                        "..." +
                        data["called"].split("-")[0].substring(38, 42) +
                        " ----- " +
                        app.api.endPointNames[data["called"].split("-")[1]] +
                        "<span class='success-green'> ----- Success ----- </span>" +
                        results["result"].length +
                        " results"
                );

                switch (data["called"].split("-")[1]) {
                    case "tokennfttx":
                        //app.data.tokennfttx = app.data.tokennfttx.concat(results["result"]);
                        results["result"].map((result) => {
                            if (app.data.hash.hasOwnProperty(result.hash)) {
                                app.data.hash[result.hash]["nft"].push(result);
                            } else {
                                app.data.hash[result.hash] = {};
                                app.data.hash[result.hash]["nft"] = [];
                                app.data.hash[result.hash]["crypto"] = [];
                                app.data.hash[result.hash]["nft"].push(result);
                            }
                        });
                        break;
                    default:
                        results["result"].map((result) => {
                            // NFT Trader issue
                            if (
                                result.to.toLowerCase() ==
                                    "0xC310e760778ECBca4C65B6C559874757A4c4Ece0".toLowerCase() ||
                                result.from.toLowerCase() ==
                                    "0xC310e760778ECBca4C65B6C559874757A4c4Ece0".toLowerCase()
                            ) {
                                //app.settings.warning = false;

                                if (!Number(result.isError)) {
                                    app.data.nftTrader.push(result);
                                    $("#warning").append(
                                        JSON.stringify(result) + "</br>"
                                    );
                                }
                            }

                            if (app.data.hash.hasOwnProperty(result.hash)) {
                                app.data.hash[result.hash]["crypto"].push(
                                    result
                                );
                            } else {
                                app.data.hash[result.hash] = {};
                                app.data.hash[result.hash]["nft"] = [];
                                app.data.hash[result.hash]["crypto"] = [];
                                app.data.hash[result.hash]["crypto"].push(
                                    result
                                );
                            }
                        });
                        break;
                }
            } else {
                results["result"] = [];
            }

            if (app.api.called.length !== app.api.stack.length) {
                for (x = 0; x < app.api.stack.length; x++) {
                    if (!app.api.called.includes(app.api.stack[x])) {
                        app.api.fetch(app.api.stack[x]);
                        $(".message").append(
                            " ----- " + x + " of " + app.api.stack.length
                        );
                        break;
                    }
                }
            } else {
                app.getPricing();

                $(".message").append(
                    " ----- " +
                        app.api.stack.length +
                        " of " +
                        app.api.stack.length
                );

                $(".message").append(
                    "<br><br>" +
                        "--------------------------------------<br><br><br>" +
                        "<span class='buildingTable'>Building Table ...</span>"
                );
            }
        });
};

app.getPricing = () => {
    $("#fx-select").off();
    let origin = window.location.origin;
    url = origin + "/api/pricing?id=" + $("#id_").text();
    fetch(url)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            app.data.pricing = data["data"];
            app.data.latest = data["latest"]["ethusd"];
            app.data.history = data["history"];
            app.data.historyDefault = data["history"];
            app.data.latestDefault = data["latest"]["ethusd"];
            app.data.staked = data["staked"];
            app.data.spam = data["spam"];
            app.initControls();

            setTimeout(() => {
                app.finish();
            }, 2000);
        });
};

app.initControls = () => {
    $("#fx-select").on("change", () => {
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
        let origin = window.location.origin;
        url = origin + "/api/pricing?id=" + $("#id_").text();
        fetch(url)
            .then((response) => {
                return response.json();
            })
            .then((data) => {
                app.data.pricing = data["data"];
                app.data.latest = data["latest"]["ethusd"];
                app.data.history = data["history"];
                app.data.historyDefault = data["history"];
                app.data.latestDefault = data["latest"]["ethusd"];

                app.finish();
            });
    });
};

app.spamFilter = (elem) => {
    app.settings.filters.spam = elem.checked ? true : false;
};

app.finish = () => {
    app.data.latest = app.data.latestDefault;
    app.data.history = app.data.historyDefault;
    app.data.history[app.getDate(app.data.latestDefault["ethusd_timestamp"])] =
        app.data.latestDefault;

    app.settings.fx = $("#fx-select").val();

    if (app.settings.fx == "ETH") {
        app.settings.decimals = 4;
        app.settings.suffix = " Ξ";
        app.settings.prefix = "";
        app.data.latest = 1;
        app.settings.fxHeading = "ETH:ETH";

        for (key in app.data.history) {
            app.data.history[key] = 1;
        }
    } else {
        app.settings.decimals = 2;
        app.settings.suffix = "";
        app.settings.prefix = "$";
        app.settings.fxHeading = "ETH:USD";
    }

    $(".message").hide();

    for (hash in app.data.hash) {
        consumed = [];
        app.data.hash[hash]["nft"].map((nft) => {
            concat_ = (
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

    app.data.dataset = [];
    app.data.unique = 0;

    for (hash in app.data.hash) {
        obj = {};
        uniqueNfts = app.data.hash[hash]["nft"].filter((nft) => {
            return !nft["duplicate"];
        });
        uniqueCryptos = app.data.hash[hash]["crypto"];

        uniqueNfts.map((nft) => {
            //flow of nft
            switch (true) {
                case !app.data.addresses.includes(nft.to.toLowerCase()) &&
                    app.data.addresses.includes(nft.from.toLowerCase()):
                    nft["nftInOut"] = "out";
                    break;
                case app.data.addresses.includes(nft.to.toLowerCase()) &&
                    !app.data.addresses.includes(nft.from.toLowerCase()):
                    nft["nftInOut"] = "in";
                    break;
                case app.data.addresses.includes(nft.to.toLowerCase()) &&
                    app.data.addresses.includes(nft.from.toLowerCase()):
                    nft["nftInOut"] = "interco";
                    break;
            }
            // airdrops
            if (uniqueCryptos.length == 0) {
                curDate = app.getDate(nft["timeStamp"]);
                unique = "unique-" + (app.data.unique += 1);
                obj = {
                    hashUrl:
                        "<a target='_blank' href='http://etherscan.io/tx/" +
                        hash +
                        "'>" +
                        "Hash</a>" +
                        " - " +
                        hash,
                    hash,
                    nftInOut: nft["nftInOut"],
                    cryptoInOut: "Send",
                    value: "0.00",
                    gasPaid: "0.00",
                    valueFormatted: "0.00",
                    gasPaidFormatted: "0.00",
                    standard: "ERC721",
                    positionHTML:
                        "<span class='position-open'>" + "Open" + "</span>",
                    position: "Open",
                    flagFormatted: app.data.spam.includes(
                        nft["contractAddress"]
                    )
                        ? "<span class='spam'>spam</span>"
                        : "",
                    flag: app.data.spam.includes(nft["contractAddress"])
                        ? "spam"
                        : "",
                    transaction: "Airdrop",
                    floorPrice: "0.00",
                    to: nft["to"],
                    from: nft["from"],
                    contractAddress: nft["contractAddress"],
                    tokenID: nft["tokenID"],
                    tokenNameLink:
                        "<a target='_blank' href='http://etherscan.io/address/" +
                        nft["contractAddress"] +
                        "'>" +
                        nft["tokenName"] +
                        "</a>",
                    tokenName: nft["tokenName"],
                    tokenSymbol: "ETH",
                    timeStamp: app.getDate(nft["timeStamp"]),
                    options:
                        "<i id='" +
                        unique +
                        "' class='fa fa-cog options' onclick='app.initOptions(this)'></i>",
                    unique: unique,
                    fx: app.commas(
                        app.data.history[curDate] || app.data.latest || 0
                    ),
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
            } else {
                gasFlag = 1;
                uniqueCryptos.map((crypto) => {
                    unique = "unique-" + (app.data.unique += 1);
                    nft["gasCalc"] =
                        ((Number(crypto.gasPrice || 0) *
                            Number(crypto.gasUsed || 0)) /
                            uniqueNfts.length /
                            1000000000000000000) *
                        gasFlag;
                    if (gasFlag) {
                        gasFlag = 0;
                    }
                    nft["valCalc"] =
                        Number(crypto.value || 0) /
                        uniqueNfts.length /
                        1000000000000000000;

                    switch (true) {
                        case !app.data.addresses.includes(
                            crypto.to.toLowerCase()
                        ) &&
                            app.data.addresses.includes(
                                crypto.from.toLowerCase()
                            ):
                            nft["cryptoInOut"] = "out";
                            break;
                        case app.data.addresses.includes(
                            crypto.to.toLowerCase()
                        ) &&
                            !app.data.addresses.includes(
                                crypto.from.toLowerCase()
                            ):
                            nft["cryptoInOut"] = "in";

                            break;
                        case app.data.addresses.includes(
                            crypto.to.toLowerCase()
                        ) &&
                            app.data.addresses.includes(
                                crypto.from.toLowerCase()
                            ):
                            nft["cryptoInOut"] = "interco";
                            break;
                    }

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

                    curDate = app.getDate(nft["timeStamp"]);

                    obj = {
                        hashUrl:
                            "<a target='_blank' href='http://etherscan.io/tx/" +
                            hash +
                            "'>" +
                            "Hash</a>" +
                            " - " +
                            hash,
                        hash: hash,
                        nftInOut: nft["nftInOut"],
                        cryptoInOut: nft["cryptoInOut"],
                        value:
                            nft["valCalc"] *
                            weight *
                            (app.data.history[curDate] || app.data.latest || 0),
                        valueFormatted: app.commas(
                            app.round(
                                nft["valCalc"] *
                                    weight *
                                    (app.data.history[curDate] ||
                                        app.data.latest ||
                                        0),
                                app.settings.decimals
                            )
                        ),
                        gasPaid:
                            nft["gasCalc"] *
                            (app.data.history[curDate] || app.data.latest || 0),
                        gasPaidFormatted: app.commas(
                            app.round(
                                nft["gasCalc"] *
                                    (app.data.history[curDate] ||
                                        app.data.latest ||
                                        0),
                                app.settings.decimals
                            )
                        ),
                        standard: "ERC721",
                        positionHTML:
                            "<span class='position-open'>" + "Open" + "</span>",
                        position: "Open",
                        transaction: type,
                        flagFormatted: app.data.spam.includes(
                            nft["contractAddress"]
                        )
                            ? "<span class='spam'>spam</span>"
                            : "",
                        flag: app.data.spam.includes(nft["contractAddress"])
                            ? "spam"
                            : "",
                        to: nft["to"],
                        from: nft["from"],
                        floorPrice: "0.00",
                        contractAddress: nft["contractAddress"],
                        tokenID: nft["tokenID"],
                        tokenNameLink:
                            "<a target='_blank' href='http://etherscan.io/address/" +
                            nft["contractAddress"] +
                            "'>" +
                            nft["tokenName"] +
                            "</a>",
                        tokenName: nft["tokenName"],
                        tokenSymbol: crypto["tokenSymbol"] || "ETH",
                        timeStamp: app.getDate(nft["timeStamp"]),
                        options:
                            "<i id='" +
                            unique +
                            "' class='fa fa-cog options' onclick='app.initOptions(this)'></i>",
                        unique: unique,
                        fx: app.commas(
                            app.data.history[curDate] || app.data.latest || 0
                        ),
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
    positionObj = {};
    app.data.dataset.map((nft) => {
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

    floorUsed = [];

    app.data.dataset.map((nft) => {
        concat_ = nft["contractAddress"] + "-" + nft["tokenID"];

        switch (positionObj[concat_]) {
            case "Closed":
                if (
                    nft["tokenSymbol"] == "ETH" ||
                    nft["tokenSymbol"] == "WETH"
                ) {
                    nft["position"] = "Closed";
                    nft["positionHTML"] =
                        "<span class='position-closed'>" + "Closed" + "</span>";

                    switch (nft["transaction"]) {
                        case "Send":
                            app.stats.sent += Math.abs(nft["value"]);
                            app.stats.gas += nft["gasPaid"];
                            break;
                        case "Receive":
                            app.stats.received += Math.abs(nft["value"]);
                            app.stats.gas += nft["gasPaid"];
                            break;
                        case "GasOnly":
                            app.stats.gas += nft["gasPaid"];
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
                                ] * (app.data.latest || 0);
                            nft["floorPrice"] = app.commas(
                                app.round(floorPrice, app.settings.decimals)
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

    app.datatable();
};

app.datatable = () => {
    if (!app.hasOwnProperty("data")) {
        return;
    } else {
        if (!app.data.hasOwnProperty("dataset")) {
            return;
        }
    }

    if (app.settings.warning) {
        $("#warning").show();
    }
    $("#tableholder").html("<table class='stripe' id='database'></table>");
    $("#run-button").removeClass("disabled");
    $("#run-button").html("Run");

    $("#database").DataTable({
        autoWidth: false,
        data: app.data.dataset,
        responsive: true,
        fixedHeader: true,
        order: [[0, "desc"]],
        columns: [
            { data: "timeStamp", title: "Transaction Date" },
            { data: "hashUrl", title: "Hash" },
            { data: "tokenNameLink", title: "Token Name" },
            { data: "tokenID", title: "Token ID" },
            { data: "standard", title: "Standard" },
            { data: "positionHTML", title: "Position" },
            { data: "transaction", title: "Transaction" },
            { data: "tokenSymbol", title: "Symbol" },
            { data: "valueFormatted", title: "Amount" },
            { data: "gasPaidFormatted", title: "Gas Paid" },
            { data: "floorPrice", title: "Floor Price" },
            { data: "fx", title: app.settings.fxHeading },
            { data: "options", title: "Options" },
        ],
        pageLength: 25,
        fixedHeader: true,
        oLanguage: {
            sSearch: "",
        },
        dom: "Bfrtip",
        buttons: ["csv", "excel"],
        language: {
            searchPlaceholder: "Search ...",
        },
        drawCallback: function () {
            app.drawStats();
            //app.initOptions();
        },
    });
};

app.drawStats = () => {
    $("#sent").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.sent, 2)) +
            app.settings.suffix
    );
    $("#received").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.received, 2)) +
            app.settings.suffix
    );
    $("#gasPaid").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.gas, 2)) +
            app.settings.suffix
    );
    $("#gasPaidOpen").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.gasOpen, 2)) +
            app.settings.suffix
    );
    $("#sentOpen").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.sentOpen, 2)) +
            app.settings.suffix
    );
    $("#valueOpen").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.valueOpen, 2)) +
            app.settings.suffix
    );
    $("#sentModal").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.sent, 2)) +
            app.settings.suffix
    );
    $("#receivedModal").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.received, 2)) +
            app.settings.suffix
    );
    $("#gasPaidModal").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.gas, 2)) +
            app.settings.suffix
    );
    $("#gasPaidOpenModal").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.gasOpen, 2)) +
            app.settings.suffix
    );
    $("#sentOpenModal").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.sentOpen, 2)) +
            app.settings.suffix
    );
    $("#valueOpenModal").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.valueOpen, 2)) +
            app.settings.suffix
    );
    $("#nftTraderSent").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.nftTraderSent, 2)) +
            app.settings.suffix
    );
    $("#nftTraderReceived").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.nftTraderReceived, 2)) +
            app.settings.suffix
    );
    $("#nftTraderGasPaid").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.nftTraderGas, 2)) +
            app.settings.suffix
    );
    $("#nftTraderSentModal").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.nftTraderSent, 2)) +
            app.settings.suffix
    );
    $("#nftTraderReceivedModal").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.nftTraderReceived, 2)) +
            app.settings.suffix
    );
    $("#nftTraderGasPaidModal").html(
        app.settings.prefix +
            app.commas(app.round(app.stats.nftTraderGas, 2)) +
            app.settings.suffix
    );

    $("#realizedWithFees").html(
        app.settings.prefix +
            app.commas(
                app.round(
                    app.stats.received - app.stats.sent - app.stats.gas,
                    2
                )
            ) +
            app.settings.suffix
    );
    $("#realizedWithFeesModal").html(
        app.settings.prefix +
            app.commas(
                app.round(
                    app.stats.received - app.stats.sent - app.stats.gas,
                    2
                )
            ) +
            app.settings.suffix
    );
    $("#unrealizedWithFees").html(
        app.settings.prefix +
            app.commas(
                app.round(
                    app.stats.valueOpen -
                        app.stats.sentOpen -
                        app.stats.gasOpen,
                    2
                )
            ) +
            app.settings.suffix
    );
    $("#unrealizedWithFeesModal").html(
        app.settings.prefix +
            app.commas(
                app.round(
                    app.stats.valueOpen -
                        app.stats.sentOpen -
                        app.stats.gasOpen,
                    2
                )
            ) +
            app.settings.suffix
    );
};

app.getDate = (timeStamp) => {
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

app.round = function (value, precision) {
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

app.commas = function (var_) {
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

app.openModal = () => {
    var span = document.getElementsByClassName("close")[0];
    span.onclick = function () {
        modal.style.display = "none";
    };
    var modal = document.getElementById("myModal");
    modal.style.display = "block";
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };

    html2canvas(document.querySelector("#canvasOutput")).then((canvas) =>
        canvas.toBlob((blob) =>
            navigator.clipboard.write([
                new ClipboardItem({ "image/png": blob }),
            ])
        )
    );
};

app.optionsMessages = () => {
    html =
        '<div id="needsFloor" class="optionsModalButton">Needs Floor Price</div><div id="needsFloorMessage" class="optionsModalMessage"><table class="optionsModalMessageTable"><tr><td>Please confirm this contract needs a floor price.</td><td><div class="confirmButton" id="needsFloorConfirm">Confirm</div></td></tr></table></div> <div id="markAsStaked" class="optionsModalButton">Mark As Staked</div><div id="markAsStakedMessage" class="optionsModalMessage"><table class="optionsModalMessageTable"><tr><td>Please confirm this was sent to a staking contract.</td><td><div class="confirmButton" id="markAsStakedConfirm">Confirm</div></td></tr></table></div><div id="markAsSpam" class="optionsModalButton">Mark As Spam</div><div id="markAsSpamMessage" class="optionsModalMessage"><table class="optionsModalMessageTable"><tr><td>Please confirm this is network spam.</td><td><div class="confirmButton" id="markAsSpamConfirm">Confirm</div></td></tr></table></div> <div id="reportError" class="optionsModalButton red">This Is An Error</div><div id="reportErrorMessage" class="optionsModalMessage">Please send a DM to <a target="_blank" href="https://twitter.com/neptuneeight">Neptune</a> on Twitter and specify the issue along with the hash.</div> ';
    return html;
};

app.initOptions = (elem) => {
    //console.log(elem);
    //console.log();
    //$(".options").on("click", function () {
    $("#optionsModalSelections").html(app.optionsMessages());
    unique = elem.id;
    app.openOptions(unique);
    $(".optionsModalMessage").hide();

    $(".optionsModalButton").on("click", function () {
        unique = $(this).attr("id");

        if ($(this).hasClass("active")) {
            $("#" + unique + "Message").toggle();
            $(this).removeClass("active");
        } else {
            $(".active").removeClass("active");
            $(".optionsModalMessage").hide();
            $("#" + unique + "Message").toggle();
            $(this).addClass("active");
        }
    });

    $(".confirmButton").on("click", function () {
        unique = $(this).attr("id");
        app.feedback(unique);
        $(this).remove();
    });
    //});
};

app.feedback = (feedback) => {
    switch (feedback) {
        case "needsFloorConfirm":
            address = app.data.txnCurrent[0]["contractAddress"];

            break;
        case "markAsStakedConfirm":
            address = app.data.txnCurrent[0]["to"].toLowerCase();
            //console.log(address);
            if (
                app.data.txnCurrent[0]["transaction"] != "GasOnly" ||
                app.data.addresses.includes(address.toLowerCase())
            ) {
                $("#markAsStakedMessage").html(
                    "<span class='error-red'>" +
                        'To mark as staked, transaction must be type "GasOnly" and "To" address must be external.' +
                        "</span>"
                );
                return;
            }
            break;
        case "markAsSpamConfirm":
            address = app.data.txnCurrent[0]["contractAddress"];

            if (
                app.data.txnCurrent[0]["transaction"] != "Airdrop" ||
                app.data.txnCurrent[0]["value"] != 0 ||
                app.data.txnCurrent[0]["gasPaid"] != 0
            ) {
                $("#markAsSpamMessage").html(
                    "<span class='error-red'>" +
                        'To mark as spam, transaction must be type "Airdrop" and have amount and gas paid of 0.' +
                        "</span>"
                );
                return;
            }

            break;
    }

    //addresses.map((address) => {
    const regexp = /^0x[a-fA-F0-9]{40}$/g;
    if (!address.toString().match(regexp)) {
        $("#" + feedback.replace("Confirm", "Message")).html(
            "invalid contract"
        );
        return;
    }

    let origin = window.location.origin;
    url =
        origin +
        "/api/feedback?id=" +
        $("#id_").text() +
        "&address=" +
        address +
        "&feedback=" +
        feedback +
        "&type=" +
        app.data.txnCurrent[0]["transaction"];

    fetch(url)
        .then((response) => {
            return response.json();
        })
        .then((data) => {
            if (data.hasOwnProperty("feedback")) {
                $("#" + data["feedback"].replace("Confirm", "Message")).html(
                    data["message"]
                );
                $(
                    "#" + data["feedback"].replace("Confirm", "Message")
                ).addClass("success-green");
            } else {
                //
            }
        });
};

app.openOptions = (unique) => {
    txn = app.data.dataset.filter((txn) => {
        return txn["unique"] == unique;
    });

    app.data.txnCurrent = txn;

    function genLink(param) {
        switch (param) {
            case "hash":
                path = "tx";
                break;
            default:
                path = "address";
                break;
        }
        return (
            "<a class='optionsLink' target='_isblank' href='https://etherscan.io/{path}/".replace(
                "{path}",
                path
            ) +
            txn[0][param] +
            "'>" +
            txn[0][param].substring(0, 6) +
            "..." +
            txn[0][param].substring(38, 42) +
            "</a>"
        );
    }

    function genText(param) {
        if (txn[0]["tokenID"].length > 10) {
            suffix = "...";
        } else {
            suffix = "";
        }

        switch (param) {
            case "Airdrop":
                text_ =
                    "<strong>" +
                    txn[0]["transaction"] +
                    "</strong>" +
                    " of " +
                    "<strong>" +
                    txn[0]["tokenNameLink"] +
                    "</strong>" +
                    " #" +
                    "<strong>" +
                    txn[0]["tokenID"].substring(0, 10) +
                    suffix +
                    "</strong>" +
                    " from " +
                    genLink("from") +
                    " to " +
                    genLink("to");
                break;
            case "GasOnly":
                text_ =
                    "<strong>Mint </strong>or<strong>  Transfer</strong> of " +
                    "<strong>" +
                    txn[0]["tokenNameLink"] +
                    "</strong>" +
                    " #" +
                    "<strong>" +
                    txn[0]["tokenID"].substring(0, 10) +
                    suffix +
                    "</strong>" +
                    " from " +
                    genLink("from") +
                    " to " +
                    genLink("to");
                break;

            default:
                text_ =
                    "<strong>" +
                    param +
                    " " +
                    app.settings.prefix +
                    app.commas(
                        app.round(
                            Math.abs(txn[0]["value"]),
                            app.settings.decimals
                        )
                    ) +
                    app.settings.suffix +
                    "</strong> for " +
                    "<strong>" +
                    txn[0]["tokenNameLink"] +
                    "</strong>" +
                    " #" +
                    "<strong>" +
                    txn[0]["tokenID"].substring(0, 10) +
                    suffix +
                    "</strong>" +
                    " from " +
                    genLink("to") +
                    " to " +
                    genLink("from");
                break;
        }

        return text_;
    }

    $(".modalText").html(
        genText(txn[0]["transaction"]) + " in hash " + genLink("hash")
    );

    $("#contractAddress").html(
        "<a target='_isblank' href='https://etherscan.io/address/" +
            txn[0]["contractAddress"] +
            "'>" +
            txn[0]["contractAddress"] +
            "</a>"
    );
    //$("#tokenName").html(txn[0]["tokenName"]);
    //$("#tokenID").html(txn[0]["tokenID"]);
    //$("#transaction").html(txn[0]["transaction"]);
    //$("#amount").html(txn[0]["value"]);

    var span = document.getElementsByClassName("optionsClose")[0];
    span.onclick = function () {
        modal.style.display = "none";
    };
    var modal = document.getElementById("optionsModal");
    modal.style.display = "block";
    window.onclick = function (event) {
        if (event.target == modal) {
            modal.style.display = "none";
        }
    };
};
