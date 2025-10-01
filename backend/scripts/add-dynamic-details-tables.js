const { db } = require('../src/models/db');

async function addDynamicDetailsTables() {
  try {
    console.log('Adding step_dynamic_details table...');
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS step_dynamic_details (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          step_id       INTEGER NOT NULL,
          key           TEXT NOT NULL,
          type          TEXT NOT NULL,
          required      INTEGER NOT NULL DEFAULT 0,
          label         TEXT NOT NULL,
          FOREIGN KEY (step_id) REFERENCES steps(id) ON DELETE CASCADE,
          UNIQUE(step_id, key)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('Adding applicant_dynamic_details table...');
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE IF NOT EXISTS applicant_dynamic_details (
          id            INTEGER PRIMARY KEY AUTOINCREMENT,
          applicant_id  INTEGER NOT NULL,
          detail_key    TEXT NOT NULL,
          value         TEXT,
          FOREIGN KEY (applicant_id) REFERENCES applicants(id) ON DELETE CASCADE,
          UNIQUE(applicant_id, detail_key)
        )
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('Adding indexes...');
    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_step_dynamic_details_step ON step_dynamic_details(step_id)`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    await new Promise((resolve, reject) => {
      db.run(`CREATE INDEX IF NOT EXISTS idx_applicant_dynamic_details_applicant ON applicant_dynamic_details(applicant_id)`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });

    console.log('Migration completed successfully!');
  } catch (e) {
    console.error('Migration failed:', e);
    process.exit(1);
  } finally {
    db.close();
  }
}

addDynamicDetailsTables();
