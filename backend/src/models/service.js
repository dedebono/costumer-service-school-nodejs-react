const { db } = require('./db');

function createService({ name, codePrefix, isActive = true, slaWarnMinutes = 10 }) {
  return new Promise((resolve, reject) => {
    if (!name || !codePrefix) {
      return reject(new Error('Name and codePrefix are required'));
    }
    db.run(
      'INSERT INTO services (name, code_prefix, is_active, sla_warn_minutes) VALUES (?, ?, ?, ?)',
      [name, codePrefix, isActive ? 1 : 0, slaWarnMinutes],
      function (err) {
        if (err) {
          return reject(err);
        }
        db.get('SELECT * FROM services WHERE id = ?', [this.lastID], (err, row) => {
          if (err) {
            return reject(err);
          }
          resolve(row);
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
    db.all(sql, params, (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

function getServiceById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM services WHERE id = ?', [id], (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row || null);
    });
  });
}

function updateService(id, { name, codePrefix, isActive, slaWarnMinutes }) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE services SET
        name = COALESCE(?, name),
        code_prefix = COALESCE(?, code_prefix),
        is_active = COALESCE(?, is_active),
        sla_warn_minutes = COALESCE(?, sla_warn_minutes)
       WHERE id = ?`,
      [name, codePrefix, isActive !== undefined ? (isActive ? 1 : 0) : null, slaWarnMinutes, id],
      function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      }
    );
  });
}

function deleteService(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM services WHERE id = ?', [id], function (err) {
      if (err) {
        return reject(err);
      }
      resolve(this.changes);
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
