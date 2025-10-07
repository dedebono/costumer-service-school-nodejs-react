const { db } = require('./db');

function getDetailsByStepId(stepId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, step_id, \`key\`, type, required, label, options
      FROM step_dynamic_details
      WHERE step_id = ?
      ORDER BY id ASC`;
    db.query(sql, [stepId], (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function insertDetail(detail) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO step_dynamic_details (step_id, \`key\`, type, required, label, options)
      VALUES (?, ?, ?, ?, ?, ?)`;
    db.query(sql, [detail.step_id, detail.key, detail.type, detail.required ? 1 : 0, detail.label, detail.options || null], (err, result) => {
      if (err) reject(err);
      else resolve({ lastID: result.insertId });
    });
  });
}

function updateDetail(detail) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE step_dynamic_details SET \`key\` = ?, type = ?, required = ?, label = ?, options = ?
      WHERE id = ? AND step_id = ?`;
    db.query(sql, [detail.key, detail.type, detail.required ? 1 : 0, detail.label, detail.options || null, detail.id, detail.step_id], (err, result) => {
      if (err) reject(err);
      else if (result.affectedRows === 0) reject(new Error('Detail not found or mismatched step'));
      else resolve({ changes: result.affectedRows });
    });
  });
}

function deleteDetail(detailId, stepId) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM step_dynamic_details WHERE id = ? AND step_id = ?`;
    db.query(sql, [detailId, stepId], (err, result) => {
      if (err) reject(err);
      else if (result.affectedRows === 0) reject(new Error('Detail not found or mismatched step'));
      else resolve({ changes: result.affectedRows });
    });
  });
}

module.exports = {
  getDetailsByStepId,
  insertDetail,
  updateDetail,
  deleteDetail,
};
