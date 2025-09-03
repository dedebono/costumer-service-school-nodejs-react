require('dotenv').config();
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = process.env.DB_PATH || './database.sqlite';

async function main() {
  const username = process.env.SUPERVISOR_USERNAME || 'admin';
  const email = process.env.SUPERVISOR_EMAIL || 'admin@example.com';
  const password = process.env.SUPERVISOR_PASSWORD || 'ChangeMeNow!';
  const role = 'Supervisor';

  const passwordHash = await bcrypt.hash(password, 10);

  const db = new sqlite3.Database(DB_PATH);

  db.serialize(() => {
    db.run(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4)))||'-'||lower(hex(randomblob(2)))||'-4'||substr(lower(hex(randomblob(2))),2)||'-'||substr('89ab',abs(random()) % 4 + 1,1)||substr(lower(hex(randomblob(2))),2)||'-'||lower(hex(randomblob(6)))),
        username      TEXT NOT NULL UNIQUE,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL CHECK (role IN ('Supervisor','CustomerService')),
        created_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at    DATETIME
      )
    `);

    db.get('SELECT 1 AS x FROM users WHERE email = ? OR username = ?', [email, username], (err, row) => {
      if (err) { console.error(err); process.exit(1); }
      if (row) {
        console.log('Supervisor already exists. Skipping.');
        db.close();
        return;
      }

      db.run(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [username, email, passwordHash, role],
        function (e2) {
          if (e2) { console.error(e2); process.exit(1); }
          console.log('✅ Supervisor created:', { username, email, role });
          db.close();
        }
      );
    });
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
