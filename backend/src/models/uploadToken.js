const { db } = require('./db');
const crypto = require('crypto');

/**
 * Generate a secure upload token for an applicant
 * Token expires in 24 hours
 */
function createUploadToken(applicantId, createdBy) {
    return new Promise((resolve, reject) => {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

        const sql = `
      INSERT INTO upload_tokens (applicant_id, token, expires_at, created_by)
      VALUES (?, ?, ?, ?)`;

        db.query(sql, [applicantId, token, expiresAt, createdBy], (err, result) => {
            if (err) return reject(err);
            resolve({
                id: result.insertId,
                token,
                applicant_id: applicantId,
                expires_at: expiresAt
            });
        });
    });
}

/**
 * Get a valid (not expired, not used) token
 */
function getValidToken(token) {
    return new Promise((resolve, reject) => {
        const sql = `
      SELECT ut.*, a.name as applicant_name, a.parent_phone
      FROM upload_tokens ut
      JOIN applicants a ON a.id = ut.applicant_id
      WHERE ut.token = ? 
        AND ut.expires_at > NOW() 
        AND ut.is_used = 0`;

        db.query(sql, [token], (err, results) => {
            if (err) return reject(err);
            resolve(results[0] || null);
        });
    });
}

/**
 * Mark token as used (after admin approves)
 */
function markTokenUsed(tokenId) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE upload_tokens SET is_used = 1 WHERE id = ?`;
        db.query(sql, [tokenId], (err, result) => {
            if (err) reject(err);
            else resolve(true);
        });
    });
}

/**
 * Get active token for an applicant (if exists)
 */
function getActiveTokenByApplicantId(applicantId) {
    return new Promise((resolve, reject) => {
        const sql = `
      SELECT * FROM upload_tokens 
      WHERE applicant_id = ? 
        AND expires_at > NOW() 
        AND is_used = 0
      ORDER BY created_at DESC
      LIMIT 1`;

        db.query(sql, [applicantId], (err, results) => {
            if (err) return reject(err);
            resolve(results[0] || null);
        });
    });
}

/**
 * Invalidate all previous tokens for an applicant
 */
function invalidatePreviousTokens(applicantId) {
    return new Promise((resolve, reject) => {
        const sql = `UPDATE upload_tokens SET is_used = 1 WHERE applicant_id = ? AND is_used = 0`;
        db.query(sql, [applicantId], (err, result) => {
            if (err) reject(err);
            else resolve(true);
        });
    });
}

module.exports = {
    createUploadToken,
    getValidToken,
    markTokenUsed,
    getActiveTokenByApplicantId,
    invalidatePreviousTokens
};
