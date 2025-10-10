const { db } = require('../src/models/db');

async function migrateAdmissionTables() {
  try {
    console.log('Starting admission tables migration...');

    // Add new columns to existing tables
    console.log('Adding columns to users table...');
    await db.promise().query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS assigned_building_id BIGINT UNSIGNED NULL,
      ADD COLUMN IF NOT EXISTS assigned_queuegroup_ids TEXT NULL
    `);

    console.log('Adding columns to queue_customers table...');
    await db.promise().query(`
      ALTER TABLE queue_customers
      ADD COLUMN IF NOT EXISTS queuegroup_id BIGINT UNSIGNED NULL
    `);

    console.log('Adding columns to queue_tickets table...');
    await db.promise().query(`
      ALTER TABLE queue_tickets
      ADD COLUMN IF NOT EXISTS building_code VARCHAR(64) NULL,
      ADD COLUMN IF NOT EXISTS queuegroup_code VARCHAR(64) NULL
    `);

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

    // Add FKs
    console.log('Adding foreign keys...');
    await db.promise().query(`
      ALTER TABLE users
      ADD CONSTRAINT IF NOT EXISTS fk_users_building
        FOREIGN KEY (assigned_building_id) REFERENCES buildings(id)
        ON UPDATE CASCADE ON DELETE SET NULL
    `);

    await db.promise().query(`
      ALTER TABLE queue_customers
      ADD CONSTRAINT IF NOT EXISTS fk_queue_customers_queuegroup
        FOREIGN KEY (queuegroup_id) REFERENCES queue_groups(id)
        ON UPDATE CASCADE ON DELETE SET NULL
    `);

    console.log('Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrateAdmissionTables();
