const { db } = require('../src/models/db');

console.log('Adding queue-customer support to existing database...');

// Add queue_customer_id column to existing queue_tickets table
db.serialize(() => {
  // First, create the queue_customers table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS queue_customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      email TEXT,
      phone TEXT NOT NULL,
      phone_verified BOOLEAN DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating queue_customers table:', err);
    } else {
      console.log('✅ queue_customers table created/verified');
    }
  });

  // Check if queue_customer_id column exists
  db.all("PRAGMA table_info(queue_tickets)", (err, columns) => {
    if (err) {
      console.error('Error checking table info:', err);
      return;
    }

    const hasQueueCustomerId = columns.some(col => col.name === 'queue_customer_id');
    
    if (!hasQueueCustomerId) {
      console.log('Adding queue_customer_id column to queue_tickets table...');
      
      // Add the new column
      db.run(`ALTER TABLE queue_tickets ADD COLUMN queue_customer_id INTEGER`, (err) => {
        if (err) {
          console.error('Error adding queue_customer_id column:', err);
        } else {
          console.log('✅ queue_customer_id column added to queue_tickets table');
          
          // Make customer_id nullable (SQLite doesn't support ALTER COLUMN, so we'll handle this in the application logic)
          console.log('✅ Database migration completed successfully!');
          console.log('Note: customer_id is now optional in queue_tickets - handled by application logic');
        }
      });

      // Create index for the new column
      db.run(`CREATE INDEX IF NOT EXISTS idx_queue_tickets_queue_customer ON queue_tickets(queue_customer_id)`, (err) => {
        if (err) {
          console.error('Error creating index:', err);
        } else {
          console.log('✅ Index created for queue_customer_id');
        }
      });

      // Create index for queue_customers phone
      db.run(`CREATE INDEX IF NOT EXISTS idx_queue_customers_phone ON queue_customers(phone)`, (err) => {
        if (err) {
          console.error('Error creating phone index:', err);
        } else {
          console.log('✅ Index created for queue_customers phone');
        }
      });
    } else {
      console.log('✅ queue_customer_id column already exists');
    }
  });
});

// Close the database connection after a short delay to ensure all operations complete
setTimeout(() => {
  db.close((err) => {
    if (err) {
      console.error('Error closing database:', err);
    } else {
      console.log('Database connection closed.');
    }
  });
}, 2000);
