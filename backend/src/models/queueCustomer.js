const { db } = require('./db');

function createQueueCustomer({ name, email, phone }) {
  return new Promise((resolve, reject) => {
    if (!phone) {
      return reject(new Error('Phone is required'));
    }
    db.query(
      'INSERT INTO queue_customers (name, email, phone) VALUES (?, ?, ?)',
      [name || null, email || null, phone],
      (err, result) => {
        if (err) {
          return reject(err);
        }
        db.query('SELECT * FROM queue_customers WHERE id = ?', [result.insertId], (err, results) => {
          if (err) {
            return reject(err);
          }
          resolve(results[0]);
        });
      }
    );
  });
}

function findOrCreateQueueCustomerByPhone({ name, email, phone }) {
  return new Promise((resolve, reject) => {
    if (!phone) {
      return reject(new Error('Phone is required'));
    }

    // First, try to find existing queue customer by phone
    db.query('SELECT * FROM queue_customers WHERE phone = ?', [phone], (err, results) => {
      if (err) return reject(err);
      const existing = results[0];
      if (existing) {
        // Update existing customer with new info if provided
        if (name || email) {
          const updateSql = 'UPDATE queue_customers SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?';
          db.query(updateSql, [name || null, email || null, existing.id], (updateErr, updateResult) => {
            if (updateErr) return reject(updateErr);
            // Return updated customer
            db.query('SELECT * FROM queue_customers WHERE id = ?', [existing.id], (getErr, getResults) => {
              if (getErr) return reject(getErr);
              resolve(getResults[0]);
            });
          });
        } else {
          return resolve(existing);
        }
      } else {
        // If not found, create new queue customer
        createQueueCustomer({ name, email, phone })
          .then(resolve)
          .catch(reject);
      }
    });
  });
}

function getAllQueueCustomers() {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM queue_customers ORDER BY name', [], (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
}

function getQueueCustomerById(id) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM queue_customers WHERE id = ?', [id], (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results[0] || null);
    });
  });
}

function updateQueueCustomer(id, { name, email, phone }) {
  return new Promise((resolve, reject) => {
    db.query(
      `UPDATE queue_customers SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE id = ?`,
      [name, email, phone, id],
      (err, result) => {
        if (err) {
          return reject(err);
        }
        resolve(result.affectedRows);
      }
    );
  });
}

function deleteQueueCustomer(id) {
  return new Promise((resolve, reject) => {
    db.query('DELETE FROM queue_customers WHERE id = ?', [id], (err, result) => {
      if (err) {
        return reject(err);
      }
      resolve(result.affectedRows);
    });
  });
}

function searchQueueCustomers({ name, phone, email, limit = 20, offset = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const clauses = [];
    const params = [];

    // Normalize
    const nameQ  = (name  || '').trim();
    const phoneQ = (phone || '').trim();
    const emailQ = (email || '').trim().toLowerCase();

    // Build OR filters
    if (nameQ)  { clauses.push('LOWER(qc.name) LIKE ?');          params.push(`%${nameQ.toLowerCase()}%`); }
    if (phoneQ) { clauses.push('qc.phone = ?');                   params.push(phoneQ); } // exact
    if (emailQ) { clauses.push('LOWER(qc.email) = ?');            params.push(emailQ); } // case-insensitive

    if (!clauses.length) return resolve([]); // require at least one filter

    // Clamp paging
    const lim = Math.min(parseInt(limit, 10) || 20, 100);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    const whereSql = 'WHERE ' + clauses.join(' OR '); // <-- OR semantics
    const sql = `
      SELECT qc.id, qc.name, qc.email, qc.phone, qc.phone_verified
      FROM queue_customers qc
      ${whereSql}
      ORDER BY qc.name ASC
      LIMIT ? OFFSET ?`;
    const listParams = [...params, lim, off];

    db.query(sql, listParams, (err, results) => (err ? reject(err) : resolve(results)));
  });
}

module.exports = {
  createQueueCustomer,
  getAllQueueCustomers,
  getQueueCustomerById,
  updateQueueCustomer,
  deleteQueueCustomer,
  searchQueueCustomers,
  findOrCreateQueueCustomerByPhone,
};
