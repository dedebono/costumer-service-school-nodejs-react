require('dotenv').config();
const bcrypt = require('bcrypt');
const mysql = require('mysql2');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'customer_service'
};

async function main() {
  const username = 'admin';
  const email = 'email@mail.com';
  const password = 'HarapanBangsa99G';
  const role = 'Supervisor';

  const passwordHash = await bcrypt.hash(password, 10);

  const db = mysql.createConnection(dbConfig);

  db.connect((err) => {
    if (err) {
      console.error('Error connecting to MySQL:', err);
      process.exit(1);
    }
    console.log('Connected to MySQL');

    db.query('SELECT 1 AS x FROM users WHERE email = ? OR username = ?', [email, username], (err, rows) => {
      if (err) { console.error(err); db.end(); process.exit(1); }
      if (rows.length > 0) {
        console.log('Admin already exists. Skipping.');
        db.end();
        return;
      }

      db.query(
        'INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
        [username, email, passwordHash, role],
        (err, result) => {
          if (err) { console.error(err); db.end(); process.exit(1); }
          console.log('✅ Admin created:', { username, email, role });
          db.end();
        }
      );
    });
  });
}

main().catch((e) => { console.error(e); process.exit(1); });
