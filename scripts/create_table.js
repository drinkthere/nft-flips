// 数据库相关
const path = require("path");
const fs = require("fs");
const dbPath = path.resolve(__dirname, "..") + "/dbs";
const dbFile = dbPath + "/mint.db";
let db;

const runSql = async (sql) => {
    db.run(sql, (err) => {
        if (null != err) {
            console.log(err);
            process.exit();
        }
    });
};

const initDb = async () => {
    if (!fs.existsSync(dbPath)) {
        fs.mkdirSync(dbPath);
    }
    const sqlite3 = require("sqlite3").verbose();
    const { open } = require("sqlite");
    db = await open({
        filename: dbFile,
        driver: sqlite3.Database,
    });
};

const main = async () => {
    await initDb();

    // create table tb_collection_address
    await runSql(
        "CREATE TABLE tb_collection_address (id INTEGER PRIMARY KEY AUTOINCREMENT, collection VARCHAR(42), collection_address VARCHAR(42), address VARCHAR(42), status TINYINT(1), create_time DATETIME DEFAULT CURRENT_TIMESTAMP, modify_time DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );
    console.log("table tb_collection_address hes been created");

    // create table tb_smart_address_flips_jc, jw是 jpeg.cash的缩写
    await runSql(
        "CREATE TABLE tb_smart_address_flips_jc (id INTEGER PRIMARY KEY AUTOINCREMENT, address VARCHAR(42), sent FLOAT DEFAULT 0, received FLOAT DEFAULT 0, gas_paid FLOAT DEFAULT 0, realized_with_fee FLOAT DEFAULT 0, sent_open FLOAT DEFAULT 0, value_open FLOAT DEFAULT 0, gas_paid_open FLOAT DEFAULT 0, unrealized_with_fee FLOAT DEFAULT 0, winning_flips INT(11) DEFAULT 0, losing_flips INT(11) DEFAULT 0, score FLOAT DEFAULT 0, create_time DATETIME DEFAULT CURRENT_TIMESTAMP, modify_time DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );
    console.log("table tb_smart_address_flips_jc hes been created");
};
main();
