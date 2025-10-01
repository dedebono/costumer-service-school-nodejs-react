const { db } = require('./db');

function getDetailsByStepId(stepId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, step_id, key, type, required, label, options
      FROM step_dynamic_details
      WHERE step_id = ?
      ORDER BY id ASC`;
    db.all(sql, [stepId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function insertDetail(detail) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO step_dynamic_details (step_id, key, type, required, label, options)
      VALUES (?, ?, ?, ?, ?, ?)`;
    db.run(sql, [detail.step_id, detail.key, detail.type, detail.required ? 1 : 0, detail.label, detail.options || null], function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID });
    });
  });
}

function updateDetail(detail) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE step_dynamic_details SET key = ?, type = ?, required = ?, label = ?, options = ?
      WHERE id = ? AND step_id = ?`;
    db.run(sql, [detail.key, detail.type, detail.required ? 1 : 0, detail.label, detail.options || null, detail.id, detail.step_id], function (err) {
      if (err) reject(err);
      else if (this.changes === 0) reject(new Error('Detail not found or mismatched step'));
      else resolve({ changes: this.changes });
    });
  });
}

function deleteDetail(detailId, stepId) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM step_dynamic_details WHERE id = ? AND step_id = ?`;
    db.run(sql, [detailId, stepId], function (err) {
      if (err) reject(err);
      else if (this.changes === 0) reject(new Error('Detail not found or mismatched step'));
      else resolve({ changes: this.changes });
    });
  });
}

module.exports = {
  getDetailsByStepId,
  insertDetail,
  updateDetail,
  deleteDetail,
};
