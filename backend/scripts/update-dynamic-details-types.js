const { db } = require('../src/models/db');

async function updateDynamicDetailsTypes() {
  try {
    console.log('Updating step_dynamic_details type ENUM to include number and date...');

    const sql = `
      ALTER TABLE step_dynamic_details
      MODIFY COLUMN \`type\` ENUM('text','number','date','checkbox','select') NOT NULL;
    `;

    await new Promise((resolve, reject) => {
      db.query(sql, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });

    console.log('Successfully updated the type ENUM.');
  } catch (error) {
    console.error('Error updating dynamic details types:', error);
    process.exit(1);
  } finally {
    db.end();
  }
}

updateDynamicDetailsTypes();
