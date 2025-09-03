const { db } = require('./db');
const crypto = require('crypto');

function createResetRequest(userId) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO password_reset_requests (user_id) VALUES (?)',
      [userId],
      function (err) {
        if (err) return reject(err);
        resolve({ id: this.lastID, userId });
      }
    );
  });
}

function getPendingRequestForUser(userId) {
    return new Promise((resolve, reject) => {
        db.get(
            "SELECT * FROM password_reset_requests WHERE user_id = ? AND status = 'pending'",
            [userId],
            (err, row) => {
                if (err) return reject(err);
                resolve(row || null);
            }
        );
    });
}

function getRequestById(id) {
    return new Promise((resolve, reject) => {
        db.get(
            "SELECT * FROM password_reset_requests WHERE id = ?",
            [id],
            (err, row) => {
                if (err) return reject(err);
                resolve(row || null);
            }
        );
    });
}

function approveRequest(requestId, supervisorId) {
  return new Promise((resolve, reject) => {
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date();
    expires.setHours(expires.getHours() + 1); // Token is valid for 1 hour

    db.run(
      `UPDATE password_reset_requests
       SET status = 'approved',
           approved_by = ?,
           approved_at = CURRENT_TIMESTAMP,
           reset_token = ?,
           token_expires_at = ?
       WHERE id = ? AND status = 'pending'`,
      [supervisorId, token, expires.toISOString(), requestId],
      function (err) {
        if (err) return reject(err);
        if (this.changes === 0) {
            return reject(new Error('Request not found or not pending'));
        }
        resolve({ token });
      }
    );
  });
}

function getRequestByToken(token) {
    return new Promise((resolve, reject) => {
        db.get(
            "SELECT * FROM password_reset_requests WHERE reset_token = ? AND status = 'approved' AND token_expires_at > CURRENT_TIMESTAMP",
            [token],
            (err, row) => {
                if (err) return reject(err);
                resolve(row || null);
            }
        );
    });
}

function markRequestAsCompleted(id) {
    return new Promise((resolve, reject) => {
        db.run(
            "UPDATE password_reset_requests SET status = 'completed', reset_token = NULL WHERE id = ?",
            [id],
            function(err) {
                if (err) return reject(err);
                resolve(this.changes > 0);
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
