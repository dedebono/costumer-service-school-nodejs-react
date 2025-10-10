// src/models/db.js
const mysql = require('mysql2');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'customer_service',
  multipleStatements: true,
  // Connection pool settings for better reliability
  connectionLimit: 10, // Maximum number of connections in the pool
  acquireTimeout: 60000, // Maximum time to acquire a connection (60 seconds)
  timeout: 60000, // Connection timeout (60 seconds)
  reconnect: true // Enable automatic reconnection
};

console.log('[DB] Creating MySQL connection pool at:', dbConfig.host, dbConfig.database);

const db = mysql.createPool(dbConfig);

// Test the connection pool
db.getConnection((err, connection) => {
  if (err) {
    console.error('Error connecting to MySQL:', err);
    process.exit(1);
  } else {
    console.log('Connected to MySQL successfully');
    connection.release(); // Release the connection back to the pool
  }
});

// Note: Schema loading is handled separately, e.g., via scripts or manual execution

module.exports = { db };
