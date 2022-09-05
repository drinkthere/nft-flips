// 1. 加载金狗的全部交易（csv)
// 2. 过滤 public mint 的address
// 3. 去重
// 4. 写入数据库进行记录

// 金狗项目名，与 csv 文件相同
const { collection } = require("minimist")(process.argv.slice(2));
const csvFile = __dirname + "/inputs/transactions/" + collection + ".csv";

// 初始化 csv 解析器
const fs = require("fs");
const parser = require("csv-parse");

// 数据库相关
const dbFile = __dirname + "/dbs/mint.db";
let db;

let collectionAddress;

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

const filterCsv = () => {
    return new Promise((resolve, reject) => {
        console.log("Start parsing csv file.");
        const addressList = [];
        fs.createReadStream(csvFile)
            .pipe(
                parser.parse({
                    columns: true,
                    delimiter: ",",
                    trim: true,
                })
            )
            .on("error", reject)
            .on("data", function (csvrow) {
                // 保留 public mint 的addr
                if (csvrow["Method"] == "Mint Public") {
                    //console.log(csvrow["From"]);
                    addressList.push(csvrow["From"]);
                    if (collectionAddress == null) {
                        collectionAddress = csvrow["To"];
                    }
                }
            })
            .on("end", function () {
                console.log("Finish parsing csv file.");
                // 去重
                const records = [...new Set(addressList)];
                resolve(records);
            });
    });
};

const save = async (records) => {
    records.forEach((addr, index) => {
        sql =
            "insert into tb_collection_address (collection, collection_address, address, status) values ('" +
            collection +
            "', '" +
            collectionAddress.toLowerCase() +
            "', '" +
            addr.toLowerCase() +
            "', 0)";
        console.log(sql);
        runSql(sql);
    });
};

const runSql = async (sql) => {
    db.run(sql, (err) => {
        if (null != err) {
            console.log(err);
            process.exit();
        }
    });
};

const main = async () => {
    console.log("Start catching smart address");
    // 初始化数据库
    await initDb();
    // 处理 csv 文件
    const records = await filterCsv();
    console.log(records);
    // 写入数据库
    await save(records);
    console.log("Finish catching smart address");
};
main();
