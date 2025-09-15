const { db } = require('./db');

function createCustomer({ name, email, phone }) {
  return new Promise((resolve, reject) => {
    if (!name || !email) {
      return reject(new Error('Name and email are required'));
    }
    db.run(
      'INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)',
      [name, email, phone],
      function (err) {
        if (err) {
          return reject(err);
        }
        db.get('SELECT * FROM customers WHERE id = ?', [this.lastID], (err, row) => {
          if (err) {
            return reject(err);
          }
          resolve(row);
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
    if (emailQ) { clauses.push('c.email = ? COLLATE NOCASE');     params.push(emailQ); } // case-insensitive

    if (!clauses.length) return resolve([]); // require at least one filter

    // Clamp paging
    const lim = Math.min(parseInt(limit, 10) || 20, 100);
    const off = Math.max(parseInt(offset, 10) || 0, 0);

    const whereSql = 'WHERE ' + clauses.join(' OR '); // <-- OR semantics
    const sql = `
      SELECT c.id, c.name, c.email, c.phone
      FROM customers c
      ${whereSql}
      ORDER BY c.name ASC
      LIMIT ? OFFSET ?`;
    const listParams = [...params, lim, off];

    db.all(sql, listParams, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function getAllCustomers() {
  return new Promise((resolve, reject) => {
    db.all('SELECT * FROM customers ORDER BY name', [], (err, rows) => {
      if (err) {
        return reject(err);
      }
      resolve(rows);
    });
  });
}

function getCustomerById(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM customers WHERE id = ?', [id], (err, row) => {
      if (err) {
        return reject(err);
      }
      resolve(row || null);
    });
  });
}

function updateCustomer(id, { name, email, phone }) {
    return new Promise((resolve, reject) => {
        db.run(
            `UPDATE customers SET name = COALESCE(?, name), email = COALESCE(?, email), phone = COALESCE(?, phone) WHERE id = ?`,
            [name, email, phone, id],
            function (err) {
                if (err) {
                    return reject(err);
                }
                resolve(this.changes);
            }
        );
    });
}

function deleteCustomer(id) {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM customers WHERE id = ?', [id], function (err) {
            if (err) {
                return reject(err);
            }
            resolve(this.changes);
        });
    });
}


module.exports = {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  searchCustomers
};
