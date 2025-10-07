// src/models/db.js
const mysql = require('mysql2');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'customer_service',
  multipleStatements: true
};

console.log('[DB] Connecting to MySQL at:', dbConfig.host, dbConfig.database);

const db = mysql.createConnection(dbConfig);

db.connect((err) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1);
  } else {
    console.log('Connected to MySQL successfully');
  }
});

// Note: Schema loading is handled separately, e.g., via scripts or manual execution

module.exports = { db };
