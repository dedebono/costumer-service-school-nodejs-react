const { db } = require('./db');

function createService({ name, codePrefix, isActive = true, slaWarnMinutes = 10, connectionType = 'none' }) {
  return new Promise((resolve, reject) => {
    if (!name || !codePrefix) {
      return reject(new Error('Name and codePrefix are required'));
    }
    if (!['none', 'admission', 'ticket'].includes(connectionType)) {
      return reject(new Error('Invalid connectionType'));
    }
    db.query(
      'INSERT INTO services (name, code_prefix, is_active, sla_warn_minutes, connection_type) VALUES (?, ?, ?, ?, ?)',
      [name, codePrefix, isActive ? 1 : 0, slaWarnMinutes, connectionType],
      (err, result) => {
        if (err) {
          return reject(err);
        }
        db.query('SELECT * FROM services WHERE id = ?', [result.insertId], (err, results) => {
          if (err) {
            return reject(err);
          }
          resolve(results[0]);
        });
      }
    );
  });
}

function getAllServices({ activeOnly = false } = {}) {
  return new Promise((resolve, reject) => {
    let sql = 'SELECT * FROM services';
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

function getServiceById(id) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM services WHERE id = ?', [id], (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results[0] || null);
    });
  });
}

function updateService(id, { name, codePrefix, isActive, slaWarnMinutes, connectionType }) {
  return new Promise((resolve, reject) => {
    if (connectionType && !['none', 'admission', 'ticket'].includes(connectionType)) {
      return reject(new Error('Invalid connectionType'));
    }
    db.query(
      `UPDATE services SET
        name = COALESCE(?, name),
        code_prefix = COALESCE(?, code_prefix),
        is_active = COALESCE(?, is_active),
        sla_warn_minutes = COALESCE(?, sla_warn_minutes),
        connection_type = COALESCE(?, connection_type)
       WHERE id = ?`,
      [name, codePrefix, isActive !== undefined ? (isActive ? 1 : 0) : null, slaWarnMinutes, connectionType, id],
      (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result.affectedRows);
      }
    );
  });
}

function deleteService(id) {
  return new Promise((resolve, reject) => {
    db.query('DELETE FROM services WHERE id = ?', [id], (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result.affectedRows);
    });
  });
}

module.exports = {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
};
