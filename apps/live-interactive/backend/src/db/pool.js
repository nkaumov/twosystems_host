const mysql = require("mysql2/promise");
const env = require("../config/env");

const pool = mysql.createPool({
  host: env.db.host,
  port: env.db.port,
  user: env.db.user,
  password: env.db.password,
  database: env.db.database,
  charset: env.db.charset,
  connectionLimit: 10,
  namedPlaceholders: true
});

module.exports = pool;
