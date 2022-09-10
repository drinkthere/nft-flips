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

    // create table tb_monitoring_address, 监控的address
    await runSql(
        "CREATE TABLE tb_monitoring_address (id INTEGER PRIMARY KEY AUTOINCREMENT, address VARCHAR(42), latest_blknum INT DEFAULT 0, STATUS TINYINT(1) DEFAULT 0, create_time DATETIME DEFAULT CURRENT_TIMESTAMP, modify_time DATETIME DEFAULT CURRENT_TIMESTAMP)"
    );
    console.log("table tb_monitoring_address hes been created");
};
main();
insert into tb_monitoring_address (address) values ('0x1fd16d9d9e6e5d16cbdbe73aaf544c7cbfcf0065');
insert into tb_monitoring_address (address, latest_blknum) values ('0xa685c9f4d20841dcb94b94e886176c6118613ff3', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0xe8789524a0e874a781dbf926c798abef2ff3a5eb', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0xd7ff44eae8cff771644732f5eb32ab8e8ecf34cd', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x3882efe29eb18bc9e1a440c36f7a2244fd7fc67e', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0xee667a3c89c7ee6e5a9595f998d32642dfd0931f', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x8adc99e70efec36665f21fb4768f881a1f3037a7', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x32910171b0a19ab0ac1b732824f3f747a7492b34', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x1ca08b0bd0cb1add5c72ca2f384d38c6ba1f1d39', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x4e216c511db4f48ba59bf05b59d5da93a9b9460a', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0xdf8ce71a151c6af023245819d60ddf4be792b38f', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x0cf26acda12973c3d104f6b3e8db64f48212be76', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x67da9c8f1be7984898b4285717de2aade896e583', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x4e140b7c76172de5ded6dbf2ed7bd0efb1c25cdd', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x8a05137fb4c4a3c65739a65440e743880225b9bf', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x0000000092df6439a45970f57ab9b08b11a22f0a', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x730e8e850af61179081a10486d16cd677bb080d6', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0xb61fcbd10382bd02581bae8ce0f0f19826570148', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x1f2934689d41ed6c0807516d238817b411d74cfc', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x4ca4b69afeee58da352913596c41a13c62fb8534', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0xaac581b147052de6fed2b6e664f380d41dbfaf68', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x218c0d9d8932400420f866f3c37cd85b0a02e8f5', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x88ffd00e53684c4b6dd20ce8db90a2926d4a0f7e', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0xf5b1bd2c5f11e4dc29cbcdf9b6bf124791a8643e', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0x134e7eeb26af8d550407c6c32f28ca01017bddbd', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0xd7cf8cee50f6a91337529567d6d26e911241d43f', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0xbd4a24389c3dad6033cecb7224f00ed2cf630754', 15507451);
insert into tb_monitoring_address (address, latest_blknum) values ('0xf34367da98d58fb4981f97dab901f9512c7acfcf', 15507451);