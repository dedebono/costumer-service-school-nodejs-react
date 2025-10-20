const { db } = require('./db');

function getApplicantById(id) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, pipeline_id, current_step_id, name, nisn, birthdate, parent_phone, email, address, notes, created_at, updated_at
      FROM applicants
      WHERE id = ?`;
    db.query(sql, [id], (err, results) => {
      if (err) reject(err);
      else resolve(results[0] || null);
    });
  });
}

function getApplicantsByPipeline(pipelineId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT id, pipeline_id, current_step_id, name, nisn, birthdate, parent_phone, email, address, notes, created_at, updated_at
      FROM applicants
      WHERE pipeline_id = ?`;
    db.query(sql, [pipelineId], (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function createApplicant({ pipeline_id, name, nisn, birthdate, parent_phone, email, address }) {
  return new Promise((resolve, reject) => {
    // First, get the first step of the pipeline
    const firstStepSql = `SELECT id FROM steps WHERE pipeline_id = ? ORDER BY ord ASC LIMIT 1`;
    db.query(firstStepSql, [pipeline_id], (err, results) => {
      if (err) return reject(err);
      const step = results[0];
      if (!step) return reject(new Error('No steps found in pipeline'));
      const current_step_id = step.id;
      const sql = `
        INSERT INTO applicants (pipeline_id, current_step_id, name, nisn, birthdate, parent_phone, email, address)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
      db.query(sql, [pipeline_id, current_step_id, name, nisn, birthdate, parent_phone, email, address], (err, result) => {
        if (err) return reject(err);
        const selectSql = `
          SELECT id, pipeline_id, current_step_id, name, nisn, birthdate, parent_phone, email, address, notes, created_at, updated_at
          FROM applicants WHERE id = ?`;
        db.query(selectSql, [result.insertId], (err2, results2) => {
          if (err2) reject(err2);
          else resolve(results2[0]);
        });
      });
    });
  });
}

function updateApplicantStep(applicantId, toStepId) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE applicants SET current_step_id = ?, updated_at = NOW() WHERE id = ?`;
    db.query(sql, [toStepId, applicantId], (err, result) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

function insertApplicantHistory(applicantId, fromStepId, toStepId, adminId, note) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO applicant_history (applicant_id, from_step_id, to_step_id, by_admin_id, note)
      VALUES (?, ?, ?, ?, ?)`;
    db.query(sql, [applicantId, fromStepId, toStepId, adminId, note || null], (err, result) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

function getStepRequirements(stepId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT doc_key FROM step_requirements WHERE step_id = ?`;
    db.query(sql, [stepId], (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function checkDocument(applicantId, docKey) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT 1 FROM applicant_documents WHERE applicant_id = ? AND doc_key = ? LIMIT 1`;
    db.query(sql, [applicantId, docKey], (err, results) => {
      if (err) reject(err);
      else resolve(results.length > 0);
    });
  });
}

function getStepById(stepId, pipelineId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT id, is_final FROM steps WHERE id = ? AND pipeline_id = ?`;
    db.query(sql, [stepId, pipelineId], (err, results) => {
      if (err) reject(err);
      else resolve(results[0] || null);
    });
  });
}

function updateApplicantNotes(applicantId, notes) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE applicants SET notes = ?, updated_at = NOW() WHERE id = ?`;
    db.query(sql, [notes, applicantId], (err, result) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

function updateApplicantData(applicantId, { name, nisn, birthdate, parent_phone, email, address, notes }) {
  return new Promise((resolve, reject) => {
    const sql = `
      UPDATE applicants SET name = ?, nisn = ?, birthdate = ?, parent_phone = ?, email = ?, address = ?, notes = ?, updated_at = NOW() WHERE id = ?`;
    db.query(sql, [name, nisn, birthdate, parent_phone, email, address, notes, applicantId], (err, result) => {
      if (err) reject(err);
      else resolve(true);
    });
  });
}

function getApplicantDynamicDetails(applicantId) {
  return new Promise((resolve, reject) => {
    const sql = `SELECT id, applicant_id, detail_key, value FROM applicant_dynamic_details WHERE applicant_id = ?`;
    db.query(sql, [applicantId], (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function setApplicantDynamicDetail(applicantId, detailKey, value) {
  return new Promise((resolve, reject) => {
    const sql = `
      INSERT INTO applicant_dynamic_details (applicant_id, detail_key, value)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE value = VALUES(value)`;
    db.query(sql, [applicantId, detailKey, value], (err, result) => {
      if (err) reject(err);
      else resolve({ lastID: result.insertId });
    });
  });
}

function checkRequiredDynamicDetailsFilled(applicantId, stepId) {
  return new Promise((resolve, reject) => {
    // Get required dynamic details for the step
    const sql = `
      SELECT \`key\` FROM step_dynamic_details
      WHERE step_id = ? AND required = 1`;
    db.query(sql, [stepId], (err, requiredDetails) => {
      if (err) return reject(err);
      if (requiredDetails.length === 0) return resolve(true); // no required details

      // Check if applicant has all required details filled
      const keys = requiredDetails.map(d => d.key);
      const placeholders = keys.map(() => '?').join(',');
      const checkSql = `
        SELECT detail_key FROM applicant_dynamic_details
        WHERE applicant_id = ? AND detail_key IN (${placeholders}) AND value IS NOT NULL AND value != ''`;
      db.query(checkSql, [applicantId, ...keys], (err2, filledDetails) => {
        if (err2) reject(err2);
        else {
          const filledKeys = filledDetails.map(d => d.detail_key);
          const missing = keys.filter(k => !filledKeys.includes(k));
          resolve(missing.length === 0 ? true : missing);
        }
      });
    });
  });
}

module.exports = {
  getApplicantById,
  getApplicantsByPipeline,
  createApplicant,
  updateApplicantStep,
  updateApplicantNotes,
  updateApplicantData,
  insertApplicantHistory,
  getStepRequirements,
  checkDocument,
  getStepById,
  getApplicantDynamicDetails,
  setApplicantDynamicDetail,
  checkRequiredDynamicDetailsFilled,
};
