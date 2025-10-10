// src/models/db.js
const mysql = require('mysql2');

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'customer_service',
  multipleStatements: true,

  // Supported pool options:
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,

  // Keep connections alive (helps avoid idle drops)
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
};

console.log('[DB] Creating MySQL connection pool at:', dbConfig.host, dbConfig.database);

const db = mysql.createPool(dbConfig);

// Optional: quick connectivity test
db.getConnection((err, conn) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1);
  } else {
    console.log('Connected to MySQL successfully');
    conn.release();
  }
});

module.exports = { db };
