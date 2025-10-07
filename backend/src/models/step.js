const { db } = require('./db');

function getStepsByPipelineId(pipelineId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, pipeline_id, title, slug, ord, is_final
      FROM steps
      WHERE pipeline_id = ?
      ORDER BY ord ASC`;
    db.query(sql, [pipelineId], (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function updateStep(step) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE steps SET title = ?, slug = ?, is_final = ?, ord = ?
      WHERE id = ? AND pipeline_id = ?`;
    db.query(sql, [step.title, step.slug, step.is_final ? 1 : 0, step.ord, step.id, step.pipeline_id], (err, result) => {
      if (err) reject(err);
      else if (result.affectedRows === 0) reject(new Error('Step not found or mismatched pipeline'));
      else resolve({ changes: result.affectedRows });
    });
  });
}

function insertStep(step) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO steps (pipeline_id, title, slug, ord, is_final)
      VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [step.pipeline_id, step.title, step.slug, step.ord, step.is_final ? 1 : 0], (err, result) => {
      if (err) reject(err);
      else resolve({ lastID: result.insertId });
    });
  });
}

function deleteStep(stepId, pipelineId) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM steps WHERE id = ? AND pipeline_id = ?`;
    db.query(sql, [stepId, pipelineId], (err, result) => {
      if (err) reject(err);
      else if (result.affectedRows === 0) reject(new Error('Step not found or mismatched pipeline'));
      else resolve({ changes: result.affectedRows });
    });
  });
}

module.exports = {
  getStepsByPipelineId,
  updateStep,
  insertStep,
  deleteStep,
};
