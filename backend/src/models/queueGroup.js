const { db } = require('./db');

function createQueueGroup({ code, name, buildingId, allowedServiceIds, isActive = true }) {
  return new Promise((resolve, reject) => {
    if (!code || !name || !buildingId) {
      return reject(new Error('Code, name, and buildingId are required'));
    }
    const allowedIdsStr = Array.isArray(allowedServiceIds) ? allowedServiceIds.join(',') : (allowedServiceIds || '');
    db.query(
      'INSERT INTO queue_groups (code, name, building_id, allowed_service_ids, is_active) VALUES (?, ?, ?, ?, ?)',
      [code, name, buildingId, allowedIdsStr, isActive ? 1 : 0],
      (err, result) => {
        if (err) {
          return reject(err);
        }
        db.query('SELECT * FROM queue_groups WHERE id = ?', [result.insertId], (err, results) => {
          if (err) {
            return reject(err);
          }
          resolve(results[0]);
        });
      }
    );
  });
}

function getAllQueueGroups({ activeOnly = false, buildingId } = {}) {
  return new Promise((resolve, reject) => {
    let sql = 'SELECT * FROM queue_groups';
    const params = [];
    if (activeOnly) {
      sql += ' WHERE is_active = 1';
    }
    if (buildingId) {
      sql += (activeOnly ? ' AND' : ' WHERE') + ' building_id = ?';
      params.push(buildingId);
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

function getQueueGroupById(id) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM queue_groups WHERE id = ?', [id], (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results[0] || null);
    });
  });
}

function updateQueueGroup(id, { code, name, buildingId, allowedServiceIds, isActive }) {
  return new Promise((resolve, reject) => {
    const allowedIdsStr = allowedServiceIds !== undefined ? (Array.isArray(allowedServiceIds) ? allowedServiceIds.join(',') : allowedServiceIds) : null;
    db.query(
      `UPDATE queue_groups SET
        code = COALESCE(?, code),
        name = COALESCE(?, name),
        building_id = COALESCE(?, building_id),
        allowed_service_ids = COALESCE(?, allowed_service_ids),
        is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [code, name, buildingId, allowedIdsStr, isActive !== undefined ? (isActive ? 1 : 0) : null, id],
      (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result.affectedRows);
      }
    );
  });
}

function deleteQueueGroup(id) {
  return new Promise((resolve, reject) => {
    db.query('DELETE FROM queue_groups WHERE id = ?', [id], (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result.affectedRows);
    });
  });
}

module.exports = {
  createQueueGroup,
  getAllQueueGroups,
  getQueueGroupById,
  updateQueueGroup,
  deleteQueueGroup,
};
