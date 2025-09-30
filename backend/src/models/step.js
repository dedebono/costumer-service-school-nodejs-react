const { db } = require('./db');

function getStepsByPipelineId(pipelineId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, pipeline_id, title, slug, ord, is_final
      FROM steps
      WHERE pipeline_id = ?
      ORDER BY ord ASC`;
    db.all(sql, [pipelineId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function updateStep(step) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE steps SET title = ?, slug = ?, is_final = ?, ord = ?
      WHERE id = ? AND pipeline_id = ?`;
    db.run(sql, [step.title, step.slug, step.is_final ? 1 : 0, step.ord, step.id, step.pipeline_id], function (err) {
      if (err) reject(err);
      else if (this.changes === 0) reject(new Error('Step not found or mismatched pipeline'));
      else resolve({ changes: this.changes });
    });
  });
}

function insertStep(step) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO steps (pipeline_id, title, slug, ord, is_final)
      VALUES (?, ?, ?, ?, ?)`;
    db.run(sql, [step.pipeline_id, step.title, step.slug, step.ord, step.is_final ? 1 : 0], function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID });
    });
  });
}

function deleteStep(stepId, pipelineId) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM steps WHERE id = ? AND pipeline_id = ?`;
    db.run(sql, [stepId, pipelineId], function (err) {
      if (err) reject(err);
      else if (this.changes === 0) reject(new Error('Step not found or mismatched pipeline'));
      else resolve({ changes: this.changes });
    });
  });
}

module.exports = {
  getStepsByPipelineId,
  updateStep,
  insertStep,
  deleteStep,
};
