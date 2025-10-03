const { db } = require('./db');

const ALLOWED_STATUSES = new Set(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']);

function createSupportTicket({ queueTicketId, summary, details, category, attachmentsJson, createdBy }) {
  return new Promise((resolve, reject) => {
    if (!queueTicketId || !createdBy) {
      return reject(new Error('queueTicketId and createdBy are required'));
    }
    db.run(
      'INSERT INTO support_tickets (queue_ticket_id, summary, details, category, attachments_json, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      [queueTicketId, summary || null, details || null, category || null, attachmentsJson || null, createdBy],
      function (err) {
        if (err) {
          return reject(err);
        }
        db.get('SELECT * FROM support_tickets WHERE id = ?', [this.lastID], (err, row) => {
          if (err) {
            return reject(err);
          }
          resolve(row);
        });
      }
    );
  });
}

function getSupportTicketById(id) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT st.*, qt.number AS queue_number, s.name AS service_name,
             c.name AS customer_name, u.username AS created_by_username
      FROM support_tickets st
      LEFT JOIN queue_tickets qt ON qt.id = st.queue_ticket_id
      LEFT JOIN services s ON s.id = qt.service_id
      LEFT JOIN customers c ON c.id = qt.customer_id
      LEFT JOIN users u ON u.id = st.created_by
      WHERE st.id = ?`;
    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function getSupportTicketsByQueueTicket(queueTicketId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT st.*, u.username AS created_by_username
      FROM support_tickets st
      LEFT JOIN users u ON u.id = st.created_by
      WHERE st.queue_ticket_id = ?
      ORDER BY st.created_at DESC`;
    db.all(sql, [queueTicketId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function getAllSupportTickets({ status, category, q, sortBy = 'created_at', sortDir = 'DESC', limit = 20, offset = 0 } = {}) {
  return new Promise((resolve, reject) => {
    const where = [];
    const params = [];

    if (status) { where.push('st.status = ?'); params.push(status); }
    if (category) { where.push('st.category = ?'); params.push(category); }
    if (q) {
      const qNorm = String(q).toLowerCase();
      where.push('(LOWER(st.summary) LIKE ? OR LOWER(st.details) LIKE ? OR LOWER(c.name) LIKE ?)');
      params.push(`%${qNorm}%`, `%${qNorm}%`, `%${qNorm}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const allowedSort = new Set(['created_at', 'updated_at', 'status', 'category', 'summary']);
    if (!allowedSort.has(sortBy)) sortBy = 'created_at';
    sortDir = String(sortDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sql = `
      SELECT st.*, qt.number AS queue_number, s.name AS service_name,
             c.name AS customer_name, u.username AS created_by_username
      FROM support_tickets st
      LEFT JOIN queue_tickets qt ON qt.id = st.queue_ticket_id
      LEFT JOIN services s ON s.id = qt.service_id
      LEFT JOIN customers c ON c.id = qt.customer_id
      LEFT JOIN users u ON u.id = st.created_by
      ${whereSql}
      ORDER BY st.${sortBy} ${sortDir}
      LIMIT ? OFFSET ?`;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM support_tickets st
      LEFT JOIN queue_tickets qt ON qt.id = st.queue_ticket_id
      LEFT JOIN customers c ON c.id = qt.customer_id
      ${whereSql}`;

    db.all(sql, [...params, limit, offset], (err, rows) => {
      if (err) return reject(err);
      db.get(countSql, params, (err2, cnt) => {
        if (err2) reject(err2);
        else resolve({ rows, total: cnt.total, limit, offset });
      });
    });
  });
}

function updateSupportTicket(id, { summary, details, status, category, attachmentsJson, resolvedAt }) {
  return new Promise((resolve, reject) => {
    if (status && !ALLOWED_STATUSES.has(status)) {
      return reject(new Error('Invalid status'));
    }
    db.run(
      `UPDATE support_tickets SET
        summary = COALESCE(?, summary),
        details = COALESCE(?, details),
        status = COALESCE(?, status),
        category = COALESCE(?, category),
        attachments_json = COALESCE(?, attachments_json),
        resolved_at = COALESCE(?, resolved_at)
       WHERE id = ?`,
      [summary, details, status, category, attachmentsJson, resolvedAt, id],
      function (err) {
        if (err) {
          return reject(err);
        }
        resolve(this.changes);
      }
    );
  });
}

function deleteSupportTicket(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM support_tickets WHERE id = ?', [id], function (err) {
      if (err) {
        return reject(err);
      }
      resolve(this.changes);
    });
  });
}

module.exports = {
  createSupportTicket,
  getSupportTicketById,
  getSupportTicketsByQueueTicket,
  getAllSupportTickets,
  updateSupportTicket,
  deleteSupportTicket,
};
