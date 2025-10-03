const { db } = require('../src/models/db');

async function addConnectionTypeColumn() {
  return new Promise((resolve, reject) => {
    // Check if column exists
    db.all("PRAGMA table_info(services)", (err, columns) => {
      if (err) {
        console.error('Error checking table info:', err);
        return reject(err);
      }

      const hasConnectionType = columns.some(col => col.name === 'connection_type');

      if (hasConnectionType) {
        console.log('connection_type column already exists');
        return resolve();
      }

      // Add the column
      db.run(
        "ALTER TABLE services ADD COLUMN connection_type TEXT CHECK(connection_type IN ('none', 'admission', 'ticket')) DEFAULT 'none'",
        (err) => {
          if (err) {
            console.error('Error adding connection_type column:', err);
            return reject(err);
          }
          console.log('Successfully added connection_type column to services table');
          resolve();
        }
      );
    });
  });
}

if (require.main === module) {
  addConnectionTypeColumn()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}

module.exports = { addConnectionTypeColumn };
