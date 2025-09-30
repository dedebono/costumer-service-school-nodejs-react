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

    const sql = `INSERT INTO tickets (id, title, description, priority, status, customer_id, created_by, created_at)
         VALUES (?,  ?,     ?,           ?,        ?,      ?,           ?,          CURRENT_TIMESTAMP)`;
    db.run(sql, [id, title, description ?? null, priority, status, customerId, createdBy], function (err) {
      if (err) return reject(err);
      const selectSql = `SELECT id, title, description, priority, status, customer_id, created_by, created_at
                 FROM tickets WHERE id = ?`;
      db.get(selectSql, [id], (err2, row) => {
        if (err2) reject(err2);
        else resolve(row);
      });
    });
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
    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
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
      const qNorm = String(q).toLowerCase();
      where.push('(LOWER(t.title) LIKE ? OR LOWER(t.description) LIKE ? OR LOWER(c.name) LIKE ? OR LOWER(c.email) LIKE ? OR c.phone LIKE ?)');
      params.push(`%${qNorm}%`, `%${qNorm}%`, `%${qNorm}%`, `%${qNorm}%`, `%${q}%`);
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
      db.get(countSql, params, (err2, cnt) => {
        if (err2) reject(err2);
        else resolve({ rows, total: cnt.total, limit, offset });
      });
    });
  });
}

function updateTicketStatus(id, status, changedBy) {
  return new Promise((resolve, reject) => {
    if (!ALLOWED_STATUS.has(status)) return reject(new Error('invalid status'));
    const selectSql = 'SELECT status FROM tickets WHERE id = ?';
    db.get(selectSql, [id], (err, current) => {
      if (err) return reject(err);
      if (!current) return reject(new Error('ticket not found'));
      const updateSql = 'UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
      db.run(updateSql, [status, id], (err2) => {
        if (err2) return reject(err2);
        const historySql = 'INSERT INTO ticket_history (ticket_id, action, old_value, new_value, changed_by, changed_at) VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)';
        db.run(historySql, [id, 'status_change', current.status, status, changedBy], (err3) => {
          if (err3) reject(err3);
          else resolve(true);
        });
      });
    });
  });
}

function deleteTicket(id) {
  return new Promise((resolve, reject) => {
    const deleteQueueSql = 'DELETE FROM queue WHERE ticket_id = ?';
    db.run(deleteQueueSql, [id], (err) => {
      if (err) return reject(err);
      const deleteTicketSql = 'DELETE FROM tickets WHERE id = ?';
      db.run(deleteTicketSql, [id], (err2) => {
        if (err2) reject(err2);
        else resolve(true);
      });
    });
  });
}

function enqueueTicket(ticketId) {
  return new Promise((resolve, reject) => {
    const sql = 'INSERT INTO queue (ticket_id, position, enqueued_at) VALUES (?, (SELECT IFNULL(MAX(position), 0) + 1 FROM queue), CURRENT_TIMESTAMP)';
    db.run(sql, [ticketId], function (err) {
      if (err) reject(err);
      else resolve(true);
    });
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
