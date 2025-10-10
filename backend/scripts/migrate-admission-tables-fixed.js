const { db } = require('../src/models/db');

async function migrateAdmissionTables() {
  try {
    console.log('Starting admission tables migration...');

    // Add new columns to existing tables (ignore if already exist)
    console.log('Adding columns to users table...');
    try {
      await db.promise().query(`ALTER TABLE users ADD COLUMN assigned_building_id BIGINT UNSIGNED NULL`);
    } catch (e) {
      if (!e.message.includes('Duplicate column name')) throw e;
    }
    try {
      await db.promise().query(`ALTER TABLE users ADD COLUMN assigned_queuegroup_ids TEXT NULL`);
    } catch (e) {
      if (!e.message.includes('Duplicate column name')) throw e;
    }

    console.log('Adding columns to queue_customers table...');
    try {
      await db.promise().query(`ALTER TABLE queue_customers ADD COLUMN queuegroup_id BIGINT UNSIGNED NULL`);
    } catch (e) {
      if (!e.message.includes('Duplicate column name')) throw e;
    }

    console.log('Adding columns to queue_tickets table...');
    try {
      await db.promise().query(`ALTER TABLE queue_tickets ADD COLUMN building_code VARCHAR(64) NULL`);
    } catch (e) {
      if (!e.message.includes('Duplicate column name')) throw e;
    }
    try {
      await db.promise().query(`ALTER TABLE queue_tickets ADD COLUMN queuegroup_code VARCHAR(64) NULL`);
    } catch (e) {
      if (!e.message.includes('Duplicate column name')) throw e;
    }

    // Create new tables
    console.log('Creating buildings table...');
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS buildings (
        id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        code              VARCHAR(64) NOT NULL UNIQUE,
        name              VARCHAR(255) NOT NULL,
        location          VARCHAR(255),
        description       TEXT,
        is_active         TINYINT(1) NOT NULL DEFAULT 1,
        created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_buildings_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    console.log('Creating queue_groups table...');
    await db.promise().query(`
      CREATE TABLE IF NOT EXISTS queue_groups (
        id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        code              VARCHAR(64) NOT NULL UNIQUE,
        name              VARCHAR(255) NOT NULL,
        building_id       BIGINT UNSIGNED NOT NULL,
        allowed_service_ids TEXT,
        is_active         TINYINT(1) NOT NULL DEFAULT 1,
        created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_queue_groups_building (building_id),
        KEY idx_queue_groups_active (is_active),
        CONSTRAINT fk_queue_groups_building
          FOREIGN KEY (building_id) REFERENCES buildings(id)
          ON UPDATE CASCADE ON DELETE RESTRICT
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);

    // Add FKs (ignore if already exist)
    console.log('Adding foreign keys...');
    try {
      await db.promise().query(`
        ALTER TABLE users
        ADD CONSTRAINT fk_users_building
          FOREIGN KEY (assigned_building_id) REFERENCES buildings(id)
          ON UPDATE CASCADE ON DELETE SET NULL
      `);
    } catch (e) {
      if (!e.message.includes('Duplicate foreign key constraint name')) throw e;
    }

    try {
      await db.promise().query(`
        ALTER TABLE queue_customers
        ADD CONSTRAINT fk_queue_customers_queuegroup
          FOREIGN KEY (queuegroup_id) REFERENCES queue_groups(id)
          ON UPDATE CASCADE ON DELETE SET NULL
      `);
    } catch (e) {
      if (!e.message.includes('Duplicate foreign key constraint name')) throw e;
    }

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateAdmissionTables();
