const { db } = require('./db');

function getPipelineById(id) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT id, name, year, created_at, updated_at FROM pipelines WHERE id = ?`;
    db.query(sql, [id], (err, results) => {
      if (err) reject(err);
      else resolve(results[0] || null);
    });
  });
}

function getPipelineWithSteps(id) {
  return new Promise((resolve, reject) => {
    const pipelineSql = `SELECT id, name, year, created_at, updated_at FROM pipelines WHERE id = ?`;
    db.query(pipelineSql, [id], (err, results) => {
      if (err) return reject(err);
      const pipeline = results[0];
      if (!pipeline) return resolve(null);
      const stepsSql = `SELECT id, pipeline_id, title, slug, ord, is_final FROM steps WHERE pipeline_id = ? ORDER BY ord ASC`;
      db.query(stepsSql, [id], (err2, steps) => {
        if (err2) reject(err2);
        else resolve({ ...pipeline, steps });
      });
    });
  });
}

function createPipeline({ name, year }) {
  return new Promise((resolve, reject) => {
    const sql = `INSERT INTO pipelines (name, year) VALUES (?, ?)`;
    db.query(sql, [name, year], (err, result) => {
      if (err) return reject(err);
      const selectSql = `SELECT id, name, year, created_at, updated_at FROM pipelines WHERE id = ?`;
      db.query(selectSql, [result.insertId], (err2, results) => {
        if (err2) reject(err2);
        else resolve(results[0]);
      });
    });
  });
}

function getAllPipelines() {
  return new Promise((resolve, reject) => {
    const sql = `SELECT id, name, year, created_at, updated_at FROM pipelines ORDER BY year DESC, name ASC`;
    db.query(sql, [], (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function deletePipeline(id) {
  return new Promise((resolve, reject) => {
    const sql = `DELETE FROM pipelines WHERE id = ?`;
    db.query(sql, [id], (err, result) => {
      if (err) reject(err);
      else if (result.affectedRows === 0) reject(new Error('Pipeline not found'));
      else resolve({ changes: result.affectedRows });
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
