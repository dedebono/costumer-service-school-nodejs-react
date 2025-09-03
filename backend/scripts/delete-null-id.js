// Delete tickets with null/empty id (and any orphan nulls in queue/ticket_history)
require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'database.sqlite');
const db = new sqlite3.Database(DB_PATH);

function all(sql, params = []) {
  return new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows)));
}
function get(sql, params = []) {
  return new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row)));
}
function run(sql, params = []) {
  return new Promise((resolve, reject) => db.run(sql, params, function (err) {
    if (err) return reject(err);
    resolve(this.changes || 0);
  }));
}
async function tableExists(name) {
  const row = await get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [name]);
  return !!row;
}

(async () => {
  try {
    console.log('[CLEANUP] Using DB:', path.resolve(DB_PATH));

    // Counts before
    const tNull = await get(`SELECT COUNT(*) AS n FROM tickets WHERE id IS NULL OR TRIM(IFNULL(id,''))=''`);
    console.log(`[CLEANUP] Tickets with NULL/empty id: ${tNull.n}`);

    const hasQueue = await tableExists('queue');
    const hasHist  = await tableExists('ticket_history');

    let qNull = 0, hNull = 0;
    if (hasQueue) {
      const r = await get(`SELECT COUNT(*) AS n FROM queue WHERE ticket_id IS NULL OR TRIM(IFNULL(ticket_id,''))=''`);
      qNull = r.n;
      console.log(`[CLEANUP] queue rows with NULL/empty ticket_id: ${qNull}`);
    } else {
      console.log('[CLEANUP] Table "queue" not found — skipping.');
    }
    if (hasHist) {
      const r = await get(`SELECT COUNT(*) AS n FROM ticket_history WHERE ticket_id IS NULL OR TRIM(IFNULL(ticket_id,''))=''`);
      hNull = r.n;
      console.log(`[CLEANUP] ticket_history rows with NULL/empty ticket_id: ${hNull}`);
    } else {
      console.log('[CLEANUP] Table "ticket_history" not found — skipping.');
    }

    // Delete dependent NULLs first (defensive)
    if (hasQueue && qNull > 0) {
      const delQ = await run(`DELETE FROM queue WHERE ticket_id IS NULL OR TRIM(IFNULL(ticket_id,''))=''`);
      console.log(`[CLEANUP] Deleted from queue: ${delQ}`);
    }
    if (hasHist && hNull > 0) {
      const delH = await run(`DELETE FROM ticket_history WHERE ticket_id IS NULL OR TRIM(IFNULL(ticket_id,''))=''`);
      console.log(`[CLEANUP] Deleted from ticket_history: ${delH}`);
    }

    // Delete the tickets with NULL/empty id
    if (tNull.n > 0) {
      const delT = await run(`DELETE FROM tickets WHERE id IS NULL OR TRIM(IFNULL(id,''))=''`);
      console.log(`[CLEANUP] Deleted tickets: ${delT}`);
    } else {
      console.log('[CLEANUP] No tickets with NULL/empty id to delete.');
    }

    console.log('[CLEANUP] Done ✅');
  } catch (e) {
    console.error('[CLEANUP] Failed:', e.message);
    process.exit(1);
  } finally {
    db.close();
  }
})();
