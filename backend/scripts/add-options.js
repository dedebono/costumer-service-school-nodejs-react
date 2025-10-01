const { db } = require('../src/models/db');

async function addOptionsColumn() {
  try {
    console.log('Adding options column to step_dynamic_details table...');
    await new Promise((resolve, reject) => {
      db.run(`ALTER TABLE step_dynamic_details ADD COLUMN options TEXT`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('Options column added successfully!');
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  } finally {
    db.close();
  }
}

addOptionsColumn();
