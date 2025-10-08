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

async function addCustomerServiceId() {
  try {
    console.log('Adding customer_service_id column to queue_tickets table...');

    // Add customer_service_id column
    await new Promise((resolve, reject) => {
      db.query(`
        ALTER TABLE queue_tickets
        ADD COLUMN customer_service_id BIGINT UNSIGNED NULL AFTER claimed_by,
        ADD INDEX idx_queue_tickets_customer_service (customer_service_id),
        ADD CONSTRAINT fk_qt_customer_service FOREIGN KEY (customer_service_id) REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL
      `, (err, result) => {
        if (err) {
          if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('customer_service_id column already exists, skipping...');
            resolve();
          } else {
            reject(err);
          }
        } else {
          console.log('Added customer_service_id column and constraints');
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

addCustomerServiceId();
