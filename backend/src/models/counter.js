const { db } = require('./db');

function createCounter({ name, allowedServiceIds, isActive = true }) {
  return new Promise((resolve, reject) => {
    if (!name) {
      return reject(new Error('Name is required'));
    }
    const allowedIdsStr = Array.isArray(allowedServiceIds) ? allowedServiceIds.join(',') : (allowedServiceIds || '');
    db.run(
      'INSERT INTO counters (name, allowed_service_ids, is_active) VALUES (?, ?, ?)',
      [name, allowedIdsStr, isActive ? 1 : 0],
      function (err) {
        if (err) {
          return reject(err);
        }
        db.get('SELECT * FROM counters WHERE id = ?', [this.lastID], (err, row) => {
          if (err) {
            return reject(err);
          }
          resolve(row);
        });
      }
    );
  });
}

function getAllCounters({ activeOnly = false } = {}) {
  return new Promise((resolve, reject) => {
    let sql = 'SELECT * FROM counters';
    const params = [];
    if (activeOnly) {
      sql += ' WHERE is_active = 1';
    }
    sql += ' ORDER BY name';
    db.all(sql, params, (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

function getCounterById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM counters WHERE id = ?', [id], (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row || null);
    });
  });
}

function updateCounter(id, { name, allowedServiceIds, isActive }) {
  return new Promise((resolve, reject) => {
    const allowedIdsStr = allowedServiceIds !== undefined ? (Array.isArray(allowedServiceIds) ? allowedServiceIds.join(',') : allowedServiceIds) : null;
    db.run(
      `UPDATE counters SET
        name = COALESCE(?, name),
        allowed_service_ids = COALESCE(?, allowed_service_ids),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name, allowedIdsStr, isActive !== undefined ? (isActive ? 1 : 0) : null, id],
      function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      }
    );
  });
}

function deleteCounter(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM counters WHERE id = ?', [id], function (err) {
      if (err) {
        return reject(err);
      }
      resolve(this.changes);
    });
  });
}

module.exports = {
  createCounter,
  getAllCounters,
  getCounterById,
  updateCounter,
  deleteCounter,
};
