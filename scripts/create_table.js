// 数据库相关
var path = require("path");
const dbFile = path.resolve(__dirname, "..") + "/dbs/mint.db";
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
  const sqlite3 = require("sqlite3").verbose();
  const { open } = require("sqlite");
  db = await open({
    filename: dbFile,
    driver: sqlite3.Database,
  });
};

const main = async () => {
  await initDb();

  // create table tb_address_collection
  await runSql(
    "CREATE TABLE tb_address_collection (id INTEGER PRIMARY KEY AUTOINCREMENT, collection VARCHAR(42), address VARCHAR(42), status TINYINT(1), create_time DATETIME DEFAULT CURRENT_TIMESTAMP, modify_time DATETIME DEFAULT CURRENT_TIMESTAMP)"
  );
  console.log("table tb_address_collection hes been created");
};
main();
