const { db } = require('./db');

function createCustomer({ name, email, phone }) {
  return new Promise((resolve, reject) => {
    if (!name || !email) {
      return reject(new Error('Name and email are required'));
    }
    db.query(
      'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)',
      [name, email, phone],
      (err, result) => {
        if (err) {
          return reject(err);
        }
        db.query('SELECT * FROM customers WHERE id = ?', [result.insertId], (err, results) => {
          if (err) {
            return reject(err);
          }
          resolve(results[0]);
        });
      }
    );
  });
}

// src/models/customer.js
function searchCustomers({ name, phone, email, limit = 20, offset = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const clauses = [];
    const params = [];

    // Normalize
    const nameQ  = (name  || '').trim();
    const phoneQ = (phone || '').trim();
    const emailQ = (email || '').trim().toLowerCase();

    // Build OR filters
    if (nameQ)  { clauses.push('LOWER(c.name) LIKE ?');          params.push(`%${nameQ.toLowerCase()}%`); }
    if (phoneQ) { clauses.push('c.phone = ?');                    params.push(phoneQ); } // exact
    if (emailQ) { clauses.push('LOWER(c.email) = ?');             params.push(emailQ); } // case-insensitive

    if (!clauses.length) return resolve([]); // require at least one filter

    // Clamp paging
    const lim = Math.min(parseInt(limit, 10) || 20, 100);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    const whereSql = 'WHERE ' + clauses.join(' OR '); // <-- OR semantics
    const sql = `
      SELECT c.id, c.name, c.email, c.phone, c.phone_verified
      FROM customers c
      ${whereSql}
      ORDER BY c.name ASC
      LIMIT ? OFFSET ?`;
    const listParams = [...params, lim, off];

    db.query(sql, listParams, (err, results) => (err ? reject(err) : resolve(results)));
  });
}

function findOrCreateCustomerByPhone({ name, email, phone }) {
  return new Promise((resolve, reject) => {
    if (!phone) {
      return reject(new Error('Phone is required'));
    }

    // First, try to find existing customer by phone
    db.query('SELECT * FROM customers WHERE phone = ?', [phone], (err, results) => {
      if (err) return reject(err);
      const existing = results[0];
      if (existing) {
        return resolve(existing);
      }

      // If not found, create new customer
      if (!name || !email) {
        return reject(new Error('Name and email are required to create new customer'));
      }

      createCustomer({ name, email, phone })
        .then(resolve)
        .catch(reject);
    });
  });
}

function getAllCustomers() {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM customers ORDER BY name', [], (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results);
    });
  });
}

function getCustomerById(id) {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM customers WHERE id = ?', [id], (err, results) => {
      if (err) {
        return reject(err);
      }
      resolve(results[0] || null);
    });
  });
}

function updateCustomer(id, { name, email, phone }) {
    return new Promise((resolve, reject) => {
        db.query(
            `UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE id = ?`,
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

function deleteCustomer(id) {
    return new Promise((resolve, reject) => {
        db.query('DELETE FROM customers WHERE id = ?', [id], (err, result) => {
            if (err) {
                return reject(err);
            }
            resolve(result.affectedRows);
        });
    });
}


module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
  findOrCreateCustomerByPhone,
};
