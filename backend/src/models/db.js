// src/models/db.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'database.sqlite');
console.log('[DB] Using SQLite at:', path.resolve(DB_PATH));

const db = new sqlite3.Database(DB_PATH);

// If you load schema.sql, keep it
const schemaPath = path.join(process.cwd(), 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(sql, (err) => {
    if (err) {
      console.error('Error executing schema:', err);
    } else {
      console.log('Schema loaded successfully');
    }
  });
}

module.exports = { db };
