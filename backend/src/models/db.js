// src/models/db.js
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'database.sqlite');
console.log('[DB] Using SQLite at:', path.resolve(DB_PATH));  // <-- log the exact file used

const db = new sqlite3.Database(DB_PATH);

// If you load schema.sql, keep it — but it won't add new columns to existing tables.
const schemaPath = path.join(process.cwd(), 'schema.sql');
if (fs.existsSync(schemaPath)) {
  const sql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(sql);
}

// ---- AUTO-MIGRATION: ensure 'created_by' exists on tickets ----
function ensureColumn(table, column, type) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table});`, [], (err, rows) => {
      if (err) return reject(err);
      const has = rows.some(r => r.name === column);
      if (has) {
        console.log(`[DB] OK: ${table}.${column} exists`);
        return resolve();
      }
      console.log(`[DB] Adding column ${table}.${column} ${type} ...`);
      db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${type};`, e2 => {
        if (e2) return reject(e2);
        console.log(`[DB] Added column ${table}.${column}`);
        resolve();
      });
    });
  });
}

// run auto-migration on startup
ensureColumn('tickets', 'created_by', 'INTEGER')
  .then(() => {
    // show columns once
    db.all(`PRAGMA table_info(tickets);`, [], (e, rows) => {
      if (!e) {
        console.log('[DB] tickets columns:');
        console.table(rows.map(r => ({ cid: r.cid, name: r.name, type: r.type })));
      }
    });
  })
  .catch(e => {
    console.error('[DB] Auto-migration failed:', e.message);
  });

module.exports = { db };
