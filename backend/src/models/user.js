const { db } = require('./db');
const bcrypt = require('bcrypt'); // boleh tetap di sini walau hashing utama di route

function authenticateUser(email, password) {
  return new Promise((resolve, reject) => {
    db.get(
      'SELECT id, username, email, password_hash AS passwordHash, role, assigned_counter_id FROM users WHERE email = ?',
      [email],
      async (err, row) => {
        if (err) return reject(err);
        if (!row) return resolve(null);
        try {
          const ok = await bcrypt.compare(password, row.passwordHash);
          if (!ok) return resolve(null);
          resolve({ id: row.id, username: row.username, email: row.email, role: row.role, assignedCounterId: row.assigned_counter_id });
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

function createUser({ username, email, passwordHash, role = 'CustomerService', assignedCounterId }) {
  return new Promise((resolve, reject) => {
    if (!username || !email || !passwordHash) {
      return reject(new Error('username, email, passwordHash required'));
    }

    db.get('SELECT 1 FROM users WHERE email = ? OR username = ?', [email, username], (err, row) => {
      if (err) return reject(err);
      if (row) return reject(new Error('User already exists'));

      // ID bisa UUID-string atau AUTOINCREMENT, sesuaikan dengan schema.sql kamu
      db.run(
        'INSERT INTO users (username, email, password_hash, role, assigned_counter_id, created_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [username, email, passwordHash, role, assignedCounterId || null],
        function (err2) {
          if (err2) return reject(err2);
          // this.lastID berisi rowid jika AUTOINCREMENT; jika pakai UUID via trigger, query lagi untuk ambil id
          db.get('SELECT id, username, email, role, assigned_counter_id FROM users WHERE rowid = ?', [this.lastID], (e3, newRow) => {
            if (e3) return reject(e3);
            resolve(newRow);
          });
        }
      );
    });
  });
}

function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT id, username, email, role, assigned_counter_id FROM users ORDER BY username', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getUserById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id, username, email, role, assigned_counter_id FROM users WHERE id = ?', [id], (err, row) => {
      if (err) return reject(err);
      resolve(row || null);
    });
  });
}

function updateUser(id, { username, email, role, passwordHash, assignedCounterId }) {
  return new Promise((resolve, reject) => {
    // Ambil user lama dulu
    db.get('SELECT id, username, email FROM users WHERE id = ?', [id], (err, current) => {
      if (err) return reject(err);
      if (!current) return resolve(0);

      // Cek unique email/username bila diubah
      const checkUniq = (cb) => {
        if ((email && email !== current.email) || (username && username !== current.username)) {
          db.get(
            'SELECT 1 FROM users WHERE (email = ? AND email <> ?) OR (username = ? AND username <> ?)',
            [email || current.email, current.email, username || current.username, current.username],
            (e2, row) => {
              if (e2) return reject(e2);
              if (row) return reject(new Error('Email or username already taken'));
              cb();
            }
          );
        } else cb();
      };

      checkUniq(() => {
        // Update hanya field yang ada (pakai COALESCE untuk mempertahankan nilai lama)
        db.run(
          `UPDATE users
             SET username = COALESCE(?, username),
                 email    = COALESCE(?, email),
                 role     = COALESCE(?, role),
                 password_hash = COALESCE(?, password_hash),
                 assigned_counter_id = COALESCE(?, assigned_counter_id),
                 updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [username ?? null, email ?? null, role ?? null, passwordHash ?? null, assignedCounterId ?? null, id],
          function (e3) {
            if (e3) return reject(e3);
            resolve(this.changes); // 1 jika berhasil
          }
        );
      });
    });
  });
}

function deleteUser(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
      if (err) return reject(err);
      resolve(this.changes); // 1 jika ada yang terhapus
    });
  });
}

module.exports = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  authenticateUser,
  deleteUser,
};
