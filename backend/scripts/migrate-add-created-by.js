require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = process.env.DB_PATH || './database.sqlite';
const COLUMN_NAME = 'created_by';       // change to TEXT if your users.id is UUID text
const COLUMN_TYPE = 'INTEGER';          // -> use 'TEXT' if users.id is UUID

const db = new sqlite3.Database(DB_PATH);

function columnExists(table, col) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${table});`, [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows.some(r => r.name === col));
    });
  });
}

function run(sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, err => (err ? reject(err) : resolve()));
  });
}

(async () => {
  try {
    const exists = await columnExists('tickets', COLUMN_NAME);
    if (!exists) {
      console.log(`Adding column ${COLUMN_NAME} to tickets ...`);
      await run(`ALTER TABLE tickets ADD COLUMN ${COLUMN_NAME} ${COLUMN_TYPE};`);
      console.log('Column added.');
    } else {
      console.log(`Column ${COLUMN_NAME} already exists. Skipping.`);
    }

    console.log('Creating index (if not exists) ...');
    await run(`CREATE INDEX IF NOT EXISTS idx_tickets_${COLUMN_NAME} ON tickets(${COLUMN_NAME});`);
    console.log('Done ✅');
  } catch (e) {
    console.error('Migration failed:', e.message);
    process.exit(1);
  } finally {
    db.close();
  }
})();
