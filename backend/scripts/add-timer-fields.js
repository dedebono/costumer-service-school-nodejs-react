const mysql = require('mysql2');

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: 'hb99g',
  database: process.env.DB_NAME || 'customer_service',
  multipleStatements: true
};

console.log('[DB] Connecting to MySQL at:', dbConfig.host, dbConfig.database);

const db = mysql.createConnection(dbConfig);

async function addTimerFields() {
  try {
    console.log('Adding timer_start and timer_end columns to queue_tickets table...');

    // Add timer_start column
    await new Promise((resolve, reject) => {
      db.query(`
        ALTER TABLE queue_tickets
        ADD COLUMN timer_start DATETIME NULL AFTER no_show_at
      `, (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('timer_start column already exists, skipping...');
            resolve();
          } else {
            reject(err);
          }
        } else {
          console.log('Added timer_start column');
          resolve(result);
        }
      });
    });

    // Add timer_end column
    await new Promise((resolve, reject) => {
      db.query(`
        ALTER TABLE queue_tickets
        ADD COLUMN timer_end DATETIME NULL AFTER timer_start
      `, (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('timer_end column already exists, skipping...');
            resolve();
          } else {
            reject(err);
          }
        } else {
          console.log('Added timer_end column');
          resolve(result);
        }
      });
    });

    console.log('Migration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    db.end();
  }
}

addTimerFields();
