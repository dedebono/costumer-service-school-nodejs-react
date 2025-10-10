const { db } = require('./db');
const bcrypt = require('bcrypt'); // boleh tetap di sini walau hashing utama di route

function authenticateUser(email, password) {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT id, username, email, password_hash AS passwordHash, role, assigned_counter_id, assigned_building_id, assigned_queuegroup_ids FROM users WHERE email = ?',
      [email],
      async (err, rows) => {
        if (err) return reject(err);
        const row = rows[0] || null;
        if (!row) return resolve(null);
        try {
          const ok = await bcrypt.compare(password, row.passwordHash);
          if (!ok) return resolve(null);
          resolve({
            id: row.id,
            username: row.username,
            email: row.email,
            role: row.role,
            assignedCounterId: row.assigned_counter_id,
            assignedBuildingId: row.assigned_building_id,
            assignedQueuegroupIds: row.assigned_queuegroup_ids
          });
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

function createUser({ username, email, passwordHash, role = 'CustomerService', assignedCounterId, assignedBuildingId, assignedQueuegroupIds }) {
  return new Promise((resolve, reject) => {
    if (!username || !email || !passwordHash) {
      return reject(new Error('username, email, passwordHash required'));
    }

    db.query('SELECT 1 FROM users WHERE email = ? OR username = ?', [email, username], (err, rows) => {
      if (err) return reject(err);
      if (rows[0]) return reject(new Error('User already exists'));

      // ID bisa UUID-string atau AUTOINCREMENT, sesuaikan dengan schema.sql kamu
      db.query(
        'INSERT INTO users (username, email, password_hash, role, assigned_counter_id, assigned_building_id, assigned_queuegroup_ids, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
        [username, email, passwordHash, role, assignedCounterId || null, assignedBuildingId || null, assignedQueuegroupIds || null],
        (err2, result) => {
          if (err2) return reject(err2);
          // result.insertId berisi id jika AUTO_INCREMENT
          db.query('SELECT id, username, email, role, assigned_counter_id, assigned_building_id, assigned_queuegroup_ids FROM users WHERE id = ?', [result.insertId], (e3, rows) => {
            if (e3) return reject(e3);
            resolve(rows[0]);
          });
        }
      );
    });
  });
}

function getAllUsers() {
  return new Promise((resolve, reject) => {
    db.query('SELECT id, username, email, role, assigned_counter_id, assigned_building_id, assigned_queuegroup_ids FROM users ORDER BY username', [], (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function getUserById(id) {
  return new Promise((resolve, reject) => {
    db.query('SELECT id, username, email, role, assigned_counter_id, assigned_building_id, assigned_queuegroup_ids FROM users WHERE id = ?', [id], (err, rows) => {
      if (err) return reject(err);
      resolve(rows[0] || null);
    });
  });
}

function updateUser(id, { username, email, role, passwordHash, assignedCounterId, assignedBuildingId, assignedQueuegroupIds }) {
  return new Promise((resolve, reject) => {
    // Ambil user lama dulu
    db.query('SELECT id, username, email FROM users WHERE id = ?', [id], (err, rows) => {
      if (err) return reject(err);
      const current = rows[0];
      if (!current) return resolve(0);

      // Cek unique email/username bila diubah
      const checkUniq = (cb) => {
        if ((email && email !== current.email) || (username && username !== current.username)) {
          db.query(
            'SELECT 1 FROM users WHERE (email = ? AND email <> ?) OR (username = ? AND username <> ?)',
            [email || current.email, current.email, username || current.username, current.username],
            (e2, rows2) => {
              if (e2) return reject(e2);
              if (rows2[0]) return reject(new Error('Email or username already taken'));
              cb();
            }
          );
        } else cb();
      };

      checkUniq(() => {
        // Update hanya field yang ada (pakai COALESCE untuk mempertahankan nilai lama)
        db.query(
          `UPDATE users
             SET username = COALESCE(?, username),
                 email    = COALESCE(?, email),
                 role     = COALESCE(?, role),
                 password_hash = COALESCE(?, password_hash),
                 assigned_counter_id = COALESCE(?, assigned_counter_id),
                 assigned_building_id = COALESCE(?, assigned_building_id),
                 assigned_queuegroup_ids = COALESCE(?, assigned_queuegroup_ids),
                 updated_at = CURRENT_TIMESTAMP
           WHERE id = ?`,
          [username ?? null, email ?? null, role ?? null, passwordHash ?? null, assignedCounterId ?? null, assignedBuildingId ?? null, assignedQueuegroupIds ?? null, id],
          (e3, result) => {
            if (e3) return reject(e3);
            resolve(result.affectedRows); // 1 jika berhasil
          }
        );
      });
    });
  });
}

function deleteUser(id) {
  return new Promise((resolve, reject) => {
    db.query('DELETE FROM users WHERE id = ?', [id], (err, result) => {
      if (err) return reject(err);
      resolve(result.affectedRows); // 1 jika ada yang terhapus
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
