const { db } = require('./db');

function createBuilding({ code, name, location, description, isActive = true }) {
  return new Promise((resolve, reject) => {
    if (!code || !name) {
      return reject(new Error('Code and name are required'));
    }
    db.query(
      'INSERT INTO buildings (code, name, location, description, is_active) VALUES (?, ?, ?, ?, ?)',
      [code, name, location || null, description || null, isActive ? 1 : 0],
      (err, result) => {
        if (err) {
          return reject(err);
        }
        db.query('SELECT * FROM buildings WHERE id = ?', [result.insertId], (err, results) => {
          if (err) {
            return reject(err);
          }
          resolve(results[0]);
        });
      }
    );
  });
}

function getAllBuildings({ activeOnly = false } = {}) {
  return new Promise((resolve, reject) => {
    let sql = 'SELECT * FROM buildings';
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

function getBuildingById(id) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM buildings WHERE id = ?', [id], (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results[0] || null);
    });
  });
}

function updateBuilding(id, { code, name, location, description, isActive }) {
  return new Promise((resolve, reject) => {
    db.query(
      `UPDATE buildings SET
        code = COALESCE(?, code),
        name = COALESCE(?, name),
        location = COALESCE(?, location),
        description = COALESCE(?, description),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [code, name, location, description, isActive !== undefined ? (isActive ? 1 : 0) : null, id],
      (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result.affectedRows);
      }
    );
  });
}

function deleteBuilding(id) {
  return new Promise((resolve, reject) => {
    db.query('DELETE FROM buildings WHERE id = ?', [id], (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result.affectedRows);
    });
  });
}

module.exports = {
  createBuilding,
  getAllBuildings,
  getBuildingById,
  updateBuilding,
  deleteBuilding,
};
