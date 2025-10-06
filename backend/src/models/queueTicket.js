const { db } = require('./db');

const ALLOWED_STATUSES = new Set(['WAITING', 'CALLED', 'IN_SERVICE', 'DONE', 'NO_SHOW', 'CANCELED']);

function createQueueTicket({ serviceId, customerId, queueCustomerId, notes }) {
  return new Promise((resolve, reject) => {
    if (!serviceId || (!customerId && !queueCustomerId)) {
      return reject(new Error('serviceId and either customerId or queueCustomerId are required'));
    }

    if (customerId && queueCustomerId) {
      return reject(new Error('Cannot specify both customerId and queueCustomerId'));
    }

    // Get service code_prefix for number generation
    db.get('SELECT code_prefix FROM services WHERE id = ? AND is_active = 1', [serviceId], (err, service) => {
      if (err) return reject(err);
      if (!service) return reject(new Error('Service not found or inactive'));

      // Generate number: prefix + sequential number for today
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const sql = `
        SELECT COUNT(*) + 1 AS next_num
        FROM queue_tickets
        WHERE service_id = ? AND DATE(created_at) = ?`;
      db.get(sql, [serviceId, today], (err2, row) => {
        if (err2) return reject(err2);
        const number = `${service.code_prefix}${String(row.next_num).padStart(3, '0')}`;

        const insertSql = `
          INSERT INTO queue_tickets (service_id, number, customer_id, queue_customer_id, status, notes, created_at)
          VALUES (?, ?, ?, ?, 'WAITING', ?, CURRENT_TIMESTAMP)`;
        db.run(insertSql, [serviceId, number, customerId || null, queueCustomerId || null, notes || null], function (err3) {
          if (err3) return reject(err3);
          db.get(`
            SELECT qt.*, s.name AS service_name, s.code_prefix,
                   c.name AS customer_name, c.phone AS customer_phone,
                   qc.name AS queue_customer_name, qc.phone AS queue_customer_phone
            FROM queue_tickets qt
            LEFT JOIN services s ON s.id = qt.service_id
            LEFT JOIN customers c ON c.id = qt.customer_id
            LEFT JOIN queue_customers qc ON qc.id = qt.queue_customer_id
            WHERE qt.id = ?
          `, [this.lastID], (err4, ticket) => {
            if (err4) reject(err4);
            else resolve(ticket);
          });
        });
      });
    });
  });
}

function getQueueTicketById(id) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT qt.*, s.name AS service_name, s.code_prefix,
             c.name AS customer_name, c.phone AS customer_phone,
             qc.name AS queue_customer_name, qc.phone AS queue_customer_phone,
             u.username AS claimed_by_username,
             (SELECT COUNT(*) + 1
              FROM queue_tickets qt2
              WHERE qt2.service_id = qt.service_id
                AND qt2.status = 'WAITING'
                AND qt2.created_at < qt.created_at) AS queue_position
      FROM queue_tickets qt
      LEFT JOIN services s ON s.id = qt.service_id
      LEFT JOIN customers c ON c.id = qt.customer_id
      LEFT JOIN queue_customers qc ON qc.id = qt.queue_customer_id
      LEFT JOIN users u ON u.id = qt.claimed_by
      WHERE qt.id = ?`;
    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row || null);
    });
  });
}

function getQueueByService(serviceId, { status, limit = 50 } = {}) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT qt.*, s.name AS service_name, s.code_prefix,
             c.name AS customer_name, c.phone AS customer_phone,
             qc.name AS queue_customer_name, qc.phone AS queue_customer_phone,
             u.username AS claimed_by_username
      FROM queue_tickets qt
      LEFT JOIN services s ON s.id = qt.service_id
      LEFT JOIN customers c ON c.id = qt.customer_id
      LEFT JOIN queue_customers qc ON qc.id = qt.queue_customer_id
      LEFT JOIN users u ON u.id = qt.claimed_by
      WHERE qt.service_id = ?`;
    const params = [serviceId];
    if (status) {
      sql += ' AND qt.status = ?';
      params.push(status);
    }
    sql += ' ORDER BY qt.created_at ASC LIMIT ?';
    params.push(limit);
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

function claimTicket(id, claimedBy) {
  return new Promise((resolve, reject) => {
    db.get('SELECT status, service_id FROM queue_tickets WHERE id = ?', [id], (err, ticket) => {
      if (err) return reject(err);
      if (!ticket) return reject(new Error('Ticket not found'));
      if (ticket.status !== 'WAITING') return reject(new Error('Ticket not available for claiming'));

      const sql = 'UPDATE queue_tickets SET status = ?, claimed_by = ?, called_at = CURRENT_TIMESTAMP WHERE id = ?';
      db.run(sql, ['CALLED', claimedBy, id], function (err2) {
        if (err2) reject(err2);
        else {
          // Emit queue update
          if (global.emitQueueUpdate) {
            global.emitQueueUpdate(ticket.service_id, { action: 'claim', ticketId: id });
          }
          // Emit ticket update
          if (global.emitTicketUpdate) {
            global.emitTicketUpdate(id, { status: 'CALLED', claimed_by: claimedBy });
          }
          resolve(this.changes);
        }
      });
    });
  });
}

function startService(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT status, service_id FROM queue_tickets WHERE id = ?', [id], (err, ticket) => {
      if (err) return reject(err);
      if (!ticket) return reject(new Error('Ticket not found'));
      if (ticket.status !== 'CALLED') return reject(new Error('Ticket must be called before starting service'));

      const sql = 'UPDATE queue_tickets SET status = ?, started_at = CURRENT_TIMESTAMP WHERE id = ?';
      db.run(sql, ['IN_SERVICE', id], function (err2) {
        if (err2) reject(err2);
        else {
          // Emit queue update
          if (global.emitQueueUpdate) {
            global.emitQueueUpdate(ticket.service_id, { action: 'start', ticketId: id });
          }
          resolve(this.changes);
        }
      });
    });
  });
}

function resolveTicket(id, notes) {
  return new Promise((resolve, reject) => {
    db.get('SELECT status FROM queue_tickets WHERE id = ?', [id], (err, ticket) => {
      if (err) return reject(err);
      if (!ticket) return reject(new Error('Ticket not found'));
      if (!['CALLED', 'IN_SERVICE'].includes(ticket.status)) return reject(new Error('Ticket not in service'));

      const sql = 'UPDATE queue_tickets SET status = ?, finished_at = CURRENT_TIMESTAMP, notes = COALESCE(?, notes) WHERE id = ?';
      db.run(sql, ['DONE', notes, id], function (err2) {
        if (err2) reject(err2);
        else resolve(this.changes);
      });
    });
  });
}

function requeueTicket(id, notes) {
  return new Promise((resolve, reject) => {
    db.get('SELECT status FROM queue_tickets WHERE id = ?', [id], (err, ticket) => {
      if (err) return reject(err);
      if (!ticket) return reject(new Error('Ticket not found'));
      if (!['CALLED', 'IN_SERVICE'].includes(ticket.status)) return reject(new Error('Ticket not in service'));

      const sql = 'UPDATE queue_tickets SET status = ?, claimed_by = NULL, called_at = NULL, started_at = NULL, notes = COALESCE(?, notes) WHERE id = ?';
      db.run(sql, ['WAITING', notes, id], function (err2) {
        if (err2) reject(err2);
        else resolve(this.changes);
      });
    });
  });
}

function markNoShow(id) {
  return new Promise((resolve, reject) => {
    db.get('SELECT status FROM queue_tickets WHERE id = ?', [id], (err, ticket) => {
      if (err) return reject(err);
      if (!ticket) return reject(new Error('Ticket not found'));
      if (ticket.status !== 'CALLED') return reject(new Error('Only called tickets can be marked as no-show'));

      const sql = 'UPDATE queue_tickets SET status = ?, no_show_at = CURRENT_TIMESTAMP WHERE id = ?';
      db.run(sql, ['NO_SHOW', id], function (err2) {
        if (err2) reject(err2);
        else resolve(this.changes);
      });
    });
  });
}

function cancelTicket(id, notes) {
  return new Promise((resolve, reject) => {
    const sql = 'UPDATE queue_tickets SET status = ?, notes = COALESCE(?, notes) WHERE id = ? AND status IN (?, ?, ?)';
    db.run(sql, ['CANCELED', notes, id, 'WAITING', 'CALLED', 'IN_SERVICE'], function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

function getQueueStatus(serviceId) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT status, COUNT(*) as count
      FROM queue_tickets
      WHERE service_id = ?
      GROUP BY status`;
    db.all(sql, [serviceId], (err, rows) => {
      if (err) reject(err);
      else {
        const statusCounts = {};
        rows.forEach(row => {
          statusCounts[row.status] = row.count;
        });
        resolve(statusCounts);
      }
    });
  });
}

module.exports = {
  createQueueTicket,
  getQueueTicketById,
  getQueueByService,
  claimTicket,
  startService,
  resolveTicket,
  requeueTicket,
  markNoShow,
  cancelTicket,
  getQueueStatus,
};
