// src/models/ticket.js
const { db } = require('./db');
const { randomUUID } = require('crypto');

const ALLOWED_STATUS   = new Set(['open', 'in_progress', 'resolved', 'closed']);
const ALLOWED_PRIORITY = new Set(['low', 'medium', 'high', 'urgent']);

function createTicket({ title, description, priority = 'medium', status = 'open', createdBy, customerId = null }) {
  return new Promise((resolve, reject) => {
    if (!title) return reject(new Error('title is required'));
    if (!createdBy) return reject(new Error('createdBy is required'));
    if (!ALLOWED_STATUS.has(status)) return reject(new Error('invalid status'));
    if (!ALLOWED_PRIORITY.has(priority)) return reject(new Error('invalid priority'));

    const id = randomUUID();

    db.run(
      `INSERT INTO tickets (id, title, description, priority, status, customer_id, created_by, created_at)
       VALUES (?,  ?,     ?,           ?,        ?,      ?,           ?,          CURRENT_TIMESTAMP)`,
      [id, title, description ?? null, priority, status, customerId, createdBy],
      function (err) {
        if (err) return reject(err);
        db.get(
          `SELECT id, title, description, priority, status, customer_id, created_by, created_at
           FROM tickets WHERE id = ?`,
          [id],
          (e2, row) => (e2 ? reject(e2) : resolve(row))
        );
      }
    );
  });
}

function getTicketById(id) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT
        t.id, t.title, t.description, t.priority, t.status,
        t.customer_id, c.name AS customer_name, c.phone AS customer_phone,
        t.created_by, u.username AS created_by_username,
        t.created_at, t.updated_at
      FROM tickets t
      LEFT JOIN users u     ON u.id = t.created_by
      LEFT JOIN customers c ON c.id = t.customer_id
      WHERE t.id = ?`;
    db.get(sql, [id], (err, row) => err ? reject(err) : resolve(row || null));
  });
}

function getAllTickets({ status, priority, q, sortBy = 'created_at', sortDir = 'DESC', limit = 20, offset = 0, createdBy, customerId } = {}) {
  return new Promise((resolve, reject) => {
    const where = [];
    const params = [];

    if (status)     { where.push('t.status = ?');       params.push(status); }
    if (priority)   { where.push('t.priority = ?');     params.push(priority); }
    if (createdBy)  { where.push('t.created_by = ?');   params.push(createdBy); }
    if (customerId) { where.push('t.customer_id = ?');  params.push(customerId); }
    if (q) {
      where.push('(t.title LIKE ? OR t.description LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)');
      params.push(`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`);
    }

    const whereSql = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const allowedSort = new Set(['created_at','updated_at','priority','status','title','customer_id','created_by']);
    if (!allowedSort.has(sortBy)) sortBy = 'created_at';
    sortDir = String(sortDir).toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

    const sql = `
      SELECT
        t.id, t.title, t.description, t.priority, t.status,
        t.customer_id, c.name AS customer_name, c.phone AS customer_phone,
        t.created_by, u.username AS created_by_username,
        t.created_at, t.updated_at
      FROM tickets t
      LEFT JOIN users u     ON u.id = t.created_by
      LEFT JOIN customers c ON c.id = t.customer_id
      ${whereSql}
      ORDER BY t.${sortBy} ${sortDir}
      LIMIT ? OFFSET ?`;

    const countSql = `
      SELECT COUNT(*) AS total
      FROM tickets t
      LEFT JOIN customers c ON c.id = t.customer_id
      ${whereSql}`;

    db.all(sql, [...params, limit, offset], (err, rows) => {
      if (err) return reject(err);
      db.get(countSql, params, (e2, cnt) => e2 ? reject(e2) : resolve({ rows, total: cnt.total, limit, offset }));
    });
  });
}

function updateTicketStatus(id, status, changedBy) {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_STATUS.has(status)) return reject(new Error('invalid status'));
    db.get('SELECT status FROM tickets WHERE id = ?', [id], (e0, current) => {
      if (e0) return reject(e0);
      if (!current) return reject(new Error('ticket not found'));
      db.run(
        'UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [status, id],
        (err) => {
          if (err) return reject(err);
          db.run(
            'INSERT INTO ticket_history (ticket_id, action, old_value, new_value, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)',
            [id, 'status_change', current.status, status, changedBy],
            (err2) => (err2 ? reject(err2) : resolve(true))
          );
        }
      );
    });
  });
}

function deleteTicket(id) {
  return new Promise((resolve, reject) => {
    db.run('DELETE FROM queue WHERE ticket_id = ?', [id], (e1) => {
      if (e1) return reject(e1);
      db.run('DELETE FROM tickets WHERE id = ?', [id], (e2) => (e2 ? reject(e2) : resolve(true)));
    });
  });
}

function enqueueTicket(ticketId) {
  return new Promise((resolve, reject) => {
    db.run(
      'INSERT INTO queue (ticket_id, position, enqueued_at) VALUES (?, (SELECT IFNULL(MAX(position), 0) + 1 FROM queue), CURRENT_TIMESTAMP)',
      [ticketId],
      (err) => (err ? reject(err) : resolve(true))
    );
  });
}

module.exports = {
  createTicket,
  getAllTickets,
  getTicketById,
  updateTicketStatus,
  deleteTicket,
  enqueueTicket,
};
