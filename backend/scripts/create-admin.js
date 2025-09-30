require('dotenv').config();
const bcrypt = require('bcrypt');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = process.env.DB_PATH || './database.sqlite';

async function main() {
  const username = 'admin';
  const email = 'email@mail.com';
  const password = 'HarapanBangsa99G';
  const role = 'Supervisor';

  const passwordHash = await bcrypt.hash(password, 10);

  const db = new sqlite3.Database(DB_PATH);

  db.serialize(() => {
    db.get('SELECT 1 AS x FROM users WHERE email = ? OR username = ?', [email, username], (err, row) => {
      if (err) { console.error(err); process.exit(1); }
      if (row) {
        console.log('Admin already exists. Skipping.');
        db.close();
        return;
      }

      db.run(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [username, email, passwordHash, role],
        function (e2) {
          if (e2) { console.error(e2); process.exit(1); }
          console.log('✅ Admin created:', { username, email, role });
          db.close();
        }
      );
    });
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
