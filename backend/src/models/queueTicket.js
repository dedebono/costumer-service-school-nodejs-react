const { db } = require('./db');
const { getSetting } = require('./setting');

const ALLOWED_STATUSES = new Set(['WAITING', 'CALLED', 'IN_SERVICE', 'DONE', 'NO_SHOW', 'CANCELED']);

function createQueueTicket({ serviceId, customerId, queueCustomerId, notes }) {
  return new Promise((resolve, reject) => {
    if (!serviceId || (!customerId && !queueCustomerId)) {
      return reject(new Error('serviceId and either customerId or queueCustomerId are required'));
    }

    if (customerId && queueCustomerId) {
      return reject(new Error('Cannot specify both customerId and queueCustomerId'));
    }

    // Get service and find queuegroup that allows this service
    db.query(`
      SELECT s.code_prefix, qg.code AS queuegroup_code, b.code AS building_code
      FROM services s
      LEFT JOIN queue_groups qg ON FIND_IN_SET(s.id, qg.allowed_service_ids) > 0 AND qg.is_active = 1
      LEFT JOIN buildings b ON b.id = qg.building_id AND b.is_active = 1
      WHERE s.id = ? AND s.is_active = 1
      LIMIT 1
    `, [serviceId], async (err, results) => {
      if (err) return reject(err);
      const data = results[0];
      if (!data) return reject(new Error('Service not found or inactive, or no active queuegroup allows this service'));

      const { code_prefix, queuegroup_code, building_code } = data;

      // Check business hours using UTC time
      const now = new Date();
      const currentUTCTime = now.getUTCHours() * 60 + now.getUTCMinutes();
      try {
        const startTimeStr = await getSetting('business_hours_start') || '09:00';
        const endTimeStr = await getSetting('business_hours_end') || '17:00';
        const [startH, startM] = startTimeStr.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const [endH, endM] = endTimeStr.split(':').map(Number);
        const endMinutes = endH * 60 + endM;
        if (currentUTCTime < startMinutes || currentUTCTime > endMinutes) {
          return reject(new Error(`cannot create queue ticket, come back later between ${startTimeStr} - ${endTimeStr} UTC`));
        }
      } catch (settingErr) {
        return reject(settingErr);
      }

      // Generate number using configurable format
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const sql = `
        SELECT COUNT(*) + 1 AS next_num
        FROM queue_tickets
        WHERE service_id = ? AND DATE(created_at) = ?`;
      db.query(sql, [serviceId, today], (err2, results2) => {
        if (err2) return reject(err2);
        const sequential = String(results2[0].next_num).padStart(3, '0');

        // Get ticket number format from settings
        getSetting('ticket_number_format').then(format => {
          if (!format) {
            format = '{building_code}/{queuegroup_code}/{service_code}/{number}'; // default
          }

          const number = format
            .replace('{building_code}', building_code)
            .replace('{queuegroup_code}', queuegroup_code)
            .replace('{service_code}', code_prefix)
            .replace('{number}', sequential);

          const insertSql = `
            INSERT INTO queue_tickets (service_id, number, building_code, queuegroup_code, customer_id, queue_customer_id, status, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 'WAITING', ?, NOW())`;
          db.query(insertSql, [serviceId, number, building_code, queuegroup_code, customerId || null, queueCustomerId || null, notes || null], (err3, result) => {
            if (err3) return reject(err3);
            db.query(`
              SELECT qt.*, s.name AS service_name, s.code_prefix,
                     c.name AS customer_name, c.phone AS customer_phone,
                     qc.name AS queue_customer_name, qc.phone AS queue_customer_phone,
                     qg.id AS queuegroup_id
              FROM queue_tickets qt
              LEFT JOIN services s ON s.id = qt.service_id
              LEFT JOIN customers c ON c.id = qt.customer_id
              LEFT JOIN queue_customers qc ON qc.id = qt.queue_customer_id
              LEFT JOIN queue_groups qg ON qg.code = qt.queuegroup_code AND qg.building_id = (SELECT id FROM buildings WHERE code = qt.building_code)
              WHERE qt.id = ?
            `, [result.insertId], (err4, results4) => {
              if (err4) reject(err4);
              else resolve(results4[0]);
            });
          });
        }).catch(err => reject(err));
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
             cs.username AS customer_service_username,
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
      LEFT JOIN users cs ON cs.id = qt.customer_service_id
      WHERE qt.id = ?`;
    db.query(sql, [id], (err, results) => {
      if (err) reject(err);
      else resolve(results[0] || null);
    });
  });
}

function getQueueByService(serviceId, { status, limit = 50, buildingCode, queuegroupCode } = {}) {
  return new Promise((resolve, reject) => {
    let sql = `
      SELECT qt.*, s.name AS service_name, s.code_prefix,
             c.name AS customer_name, c.phone AS customer_phone,
             qc.name AS queue_customer_name, qc.phone AS queue_customer_phone,
             u.username AS claimed_by_username,
             cs.username AS customer_service_username
      FROM queue_tickets qt
      LEFT JOIN services s ON s.id = qt.service_id
      LEFT JOIN customers c ON c.id = qt.customer_id
      LEFT JOIN queue_customers qc ON qc.id = qt.queue_customer_id
      LEFT JOIN users u ON u.id = qt.claimed_by
      LEFT JOIN users cs ON cs.id = qt.customer_service_id
      WHERE qt.service_id = ?`;
    const params = [serviceId];
    if (status) {
      sql += ' AND qt.status = ?';
      params.push(status);
    }
    if (buildingCode) {
      sql += ' AND qt.building_code = ?';
      params.push(buildingCode);
    }
    if (queuegroupCode) {
      sql += ' AND qt.queuegroup_code = ?';
      params.push(queuegroupCode);
    }
    sql += ' ORDER BY qt.created_at ASC LIMIT ?';
    params.push(limit);
    db.query(sql, params, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
}

function claimTicket(id, claimedBy) {
  return new Promise((resolve, reject) => {
    db.query('SELECT status, service_id FROM queue_tickets WHERE id = ?', [id], (err, results) => {
      if (err) return reject(err);
      const ticket = results[0];
      if (!ticket) return reject(new Error('Ticket not found'));
      if (ticket.status !== 'WAITING') return reject(new Error('Ticket not available for claiming'));

      const sql = 'UPDATE queue_tickets SET status = ?, claimed_by = ?, customer_service_id = ?, called_at = NOW(), timer_start = NOW() WHERE id = ?';
      db.query(sql, ['CALLED', claimedBy, claimedBy, id], (err2, result) => {
        if (err2) reject(err2);
        else {
          // Emit queue update with delay for robustness
          setTimeout(() => {
            if (global.emitQueueUpdate) {
              global.emitQueueUpdate(ticket.service_id, { action: 'claim', ticketId: id });
            }
            // Emit ticket update
            if (global.emitTicketUpdate) {
              global.emitTicketUpdate(id, { status: 'CALLED', claimed_by: claimedBy });
            }
          }, 100);
          resolve(result.affectedRows);
        }
      });
    });
  });
}

function startService(id) {
  return new Promise((resolve, reject) => {
    db.query('SELECT status, service_id FROM queue_tickets WHERE id = ?', [id], (err, results) => {
      if (err) return reject(err);
      const ticket = results[0];
      if (!ticket) return reject(new Error('Ticket not found'));
      if (ticket.status !== 'CALLED') return reject(new Error('Ticket must be called before starting service'));

      const sql = 'UPDATE queue_tickets SET status = ?, started_at = NOW() WHERE id = ?';
      db.query(sql, ['IN_SERVICE', id], (err2, result) => {
        if (err2) reject(err2);
        else {
          // Emit queue update with delay for robustness
          setTimeout(() => {
            if (global.emitQueueUpdate) {
              global.emitQueueUpdate(ticket.service_id, { action: 'start', ticketId: id });
            }
          }, 100);
          resolve(result.affectedRows);
        }
      });
    });
  });
}

function resolveTicket(id, notes) {
  return new Promise((resolve, reject) => {
    db.query('SELECT status, service_id FROM queue_tickets WHERE id = ?', [id], (err, results) => {
      if (err) return reject(err);
      const ticket = results[0];
      if (!ticket) return reject(new Error('Ticket not found'));
      if (!['CALLED', 'IN_SERVICE'].includes(ticket.status)) return reject(new Error('Ticket not in service'));

      const sql = 'UPDATE queue_tickets SET status = ?, finished_at = NOW(), timer_end = NOW(), notes = COALESCE(?, notes) WHERE id = ?';
      db.query(sql, ['DONE', notes, id], (err2, result) => {
        if (err2) reject(err2);
        else {
          // Emit queue update with delay for robustness
          setTimeout(() => {
            if (global.emitQueueUpdate) {
              global.emitQueueUpdate(ticket.service_id, { action: 'resolve', ticketId: id });
            }
          }, 100);
          resolve(result.affectedRows);
        }
      });
    });
  });
}

function requeueTicket(id, notes) {
  return new Promise((resolve, reject) => {
    db.query('SELECT status, service_id FROM queue_tickets WHERE id = ?', [id], (err, results) => {
      if (err) return reject(err);
      const ticket = results[0];
      if (!ticket) return reject(new Error('Ticket not found'));
      if (!['CALLED', 'IN_SERVICE'].includes(ticket.status)) return reject(new Error('Ticket not in service'));

      const sql = 'UPDATE queue_tickets SET status = ?, claimed_by = NULL, customer_service_id = NULL, called_at = NULL, started_at = NULL, notes = COALESCE(?, notes) WHERE id = ?';
      db.query(sql, ['WAITING', notes, id], (err2, result) => {
        if (err2) reject(err2);
        else {
          // Emit queue update with delay for robustness
          setTimeout(() => {
            if (global.emitQueueUpdate) {
              global.emitQueueUpdate(ticket.service_id, { action: 'requeue', ticketId: id });
            }
          }, 100);
          resolve(result.affectedRows);
        }
      });
    });
  });
}

function markNoShow(id) {
  return new Promise((resolve, reject) => {
    db.query('SELECT status, service_id FROM queue_tickets WHERE id = ?', [id], (err, results) => {
      if (err) return reject(err);
      const ticket = results[0];
      if (!ticket) return reject(new Error('Ticket not found'));
      if (ticket.status !== 'CALLED') return reject(new Error('Only called tickets can be marked as no-show'));

      const sql = 'UPDATE queue_tickets SET status = ?, no_show_at = NOW(), timer_end = NOW() WHERE id = ?';
      db.query(sql, ['NO_SHOW', id], (err2, result) => {
        if (err2) reject(err2);
        else {
          // Emit queue update with delay for robustness
          setTimeout(() => {
            if (global.emitQueueUpdate) {
              global.emitQueueUpdate(ticket.service_id, { action: 'no-show', ticketId: id });
            }
          }, 100);
          resolve(result.affectedRows);
        }
      });
    });
  });
}

function cancelTicket(id, notes) {
  return new Promise((resolve, reject) => {
    db.query('SELECT service_id FROM queue_tickets WHERE id = ?', [id], (err, results) => {
      if (err) return reject(err);
      const ticket = results[0];
      if (!ticket) return reject(new Error('Ticket not found'));

      const sql = 'UPDATE queue_tickets SET status = ?, notes = COALESCE(?, notes) WHERE id = ? AND status IN (?, ?, ?)';
      db.query(sql, ['CANCELED', notes, id, 'WAITING', 'CALLED', 'IN_SERVICE'], (err2, result) => {
        if (err2) reject(err2);
        else {
          // Emit queue update with delay for robustness
          setTimeout(() => {
            if (global.emitQueueUpdate) {
              global.emitQueueUpdate(ticket.service_id, { action: 'cancel', ticketId: id });
            }
          }, 100);
          resolve(result.affectedRows);
        }
      });
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
    db.query(sql, [serviceId], (err, results) => {
      if (err) reject(err);
      else {
        const statusCounts = {};
        results.forEach(row => {
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
