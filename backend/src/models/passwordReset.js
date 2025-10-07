const { db } = require('./db');
const crypto = require('crypto');

function createResetRequest(userId) {
  return new Promise((resolve, reject) => {
    db.query(
      'INSERT INTO password_reset_requests (user_id) VALUES (?)',
      [userId],
      (err, result) => {
        if (err) return reject(err);
        resolve({ id: result.insertId, userId });
      }
    );
  });
}

function getPendingRequestForUser(userId) {
    return new Promise((resolve, reject) => {
        db.query(
            "SELECT * FROM password_reset_requests WHERE user_id = ? AND status = 'pending'",
            [userId],
            (err, results) => {
                if (err) return reject(err);
                resolve(results[0] || null);
            }
        );
    });
}

function getRequestById(id) {
    return new Promise((resolve, reject) => {
        db.query(
            "SELECT * FROM password_reset_requests WHERE id = ?",
            [id],
            (err, results) => {
                if (err) return reject(err);
                resolve(results[0] || null);
            }
        );
    });
}

function approveRequest(requestId, supervisorId) {
  return new Promise((resolve, reject) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Token is valid for 1 hour

    db.query(
      `UPDATE password_reset_requests
       SET status = 'approved',
           approved_by = ?,
           approved_at = NOW(),
           reset_token = ?,
           token_expires_at = ?
       WHERE id = ? AND status = 'pending'`,
      [supervisorId, token, expires.toISOString(), requestId],
      (err, result) => {
        if (err) return reject(err);
        if (result.affectedRows === 0) {
            return reject(new Error('Request not found or not pending'));
        }
        resolve({ token });
      }
    );
  });
}

function getRequestByToken(token) {
    return new Promise((resolve, reject) => {
        db.query(
            "SELECT * FROM password_reset_requests WHERE reset_token = ? AND status = 'approved' AND token_expires_at > NOW()",
            [token],
            (err, results) => {
                if (err) return reject(err);
                resolve(results[0] || null);
            }
        );
    });
}

function markRequestAsCompleted(id) {
    return new Promise((resolve, reject) => {
        db.query(
            "UPDATE password_reset_requests SET status = 'completed', reset_token = NULL WHERE id = ?",
            [id],
            (err, result) => {
                if (err) return reject(err);
                resolve(result.affectedRows > 0);
            }
        );
    });
}

module.exports = {
  createResetRequest,
  getPendingRequestForUser,
  getRequestById,
  approveRequest,
  getRequestByToken,
  markRequestAsCompleted,
};
