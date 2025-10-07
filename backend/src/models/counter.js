const { db } = require('./db');

function createCounter({ name, allowedServiceIds, isActive = true }) {
  return new Promise((resolve, reject) => {
    if (!name) {
      return reject(new Error('Name is required'));
    }
    const allowedIdsStr = Array.isArray(allowedServiceIds) ? allowedServiceIds.join(',') : (allowedServiceIds || '');
    db.query(
      'INSERT INTO counters (name, allowed_service_ids, is_active) VALUES (?, ?, ?)',
      [name, allowedIdsStr, isActive ? 1 : 0],
      (err, result) => {
        if (err) {
          return reject(err);
        }
        db.query('SELECT * FROM counters WHERE id = ?', [result.insertId], (err, results) => {
          if (err) {
            return reject(err);
          }
          resolve(results[0]);
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
    db.query(sql, params, (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
}

function getCounterById(id) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM counters WHERE id = ?', [id], (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results[0] || null);
    });
  });
}

function updateCounter(id, { name, allowedServiceIds, isActive }) {
  return new Promise((resolve, reject) => {
    const allowedIdsStr = allowedServiceIds !== undefined ? (Array.isArray(allowedServiceIds) ? allowedServiceIds.join(',') : allowedServiceIds) : null;
    db.query(
      `UPDATE counters SET
        name = COALESCE(?, name),
        allowed_service_ids = COALESCE(?, allowed_service_ids),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [name, allowedIdsStr, isActive !== undefined ? (isActive ? 1 : 0) : null, id],
      (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result.affectedRows);
      }
    );
  });
}

function deleteCounter(id) {
  return new Promise((resolve, reject) => {
    db.query('DELETE FROM counters WHERE id = ?', [id], (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result.affectedRows);
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
