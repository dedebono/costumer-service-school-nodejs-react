const { db } = require('./db');

function getPipelineById(id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT id, name, year, created_at, updated_at FROM pipelines WHERE id = ?`;
    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function getPipelineWithSteps(id) {
  return new Promise((resolve, reject) => {
    const pipelineSql = `SELECT id, name, year, created_at, updated_at FROM pipelines WHERE id = ?`;
    db.get(pipelineSql, [id], (err, pipeline) => {
      if (err) return reject(err);
      if (!pipeline) return resolve(null);
      const stepsSql = `SELECT id, pipeline_id, title, slug, ord, is_final FROM steps WHERE pipeline_id = ? ORDER BY ord ASC`;
      db.all(stepsSql, [id], (err2, steps) => {
        if (err2) reject(err2);
        else resolve({ ...pipeline, steps });
      });
    });
  });
}

function createPipeline({ name, year }) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO pipelines (name, year) VALUES (?, ?)`;
    db.run(sql, [name, year], function (err) {
      if (err) return reject(err);
      const selectSql = `SELECT id, name, year, created_at, updated_at FROM pipelines WHERE id = ?`;
      db.get(selectSql, [this.lastID], (err2, row) => {
        if (err2) reject(err2);
        else resolve(row);
      });
    });
  });
}

function getAllPipelines() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT id, name, year, created_at, updated_at FROM pipelines ORDER BY year DESC, name ASC`;
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function deletePipeline(id) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM pipelines WHERE id = ?`;
    db.run(sql, [id], function (err) {
      if (err) reject(err);
      else if (this.changes === 0) reject(new Error('Pipeline not found'));
      else resolve({ changes: this.changes });
    });
  });
}

module.exports = {
  getPipelineById,
  getPipelineWithSteps,
  createPipeline,
  getAllPipelines,
  deletePipeline,
};
