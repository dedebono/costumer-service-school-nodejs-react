// scripts/setup-admission-database.js
// Run with: node -r dotenv/config scripts/setup-admission-database.js
// Requires: DB_HOST, DB_USER, DB_PASSWORD, DB_NAME set (via .env or exported env)

const { db } = require('../src/models/db'); // assumes mysql2 pool; db.promise() is available

// scripts/setup-admission-database.js  (only the helper changed)
async function ensureColumn(table, column, definition) {
  const [rows] = await db.promise().query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?`,
    [table, column]
  );
  if (rows.length === 0) {
    // NOTE: include the column name here:
    await db.promise().query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`+ Added column ${table}.${column}`);
  } else {
    console.log(`= Column ${table}.${column} already exists`);
  }
}


async function ensureForeignKey(table, fkName, fkSql) {
  const [rows] = await db.promise().query(
    `SELECT 1 FROM information_schema.table_constraints
     WHERE table_schema = DATABASE()
       AND table_name = ?
       AND constraint_name = ?
       AND constraint_type='FOREIGN KEY'`,
    [table, fkName]
  );
  if (rows.length === 0) {
    await db.promise().query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${fkName}\` ${fkSql}`);
    console.log(`+ Added FK ${table}.${fkName}`);
  } else {
    console.log(`= FK ${table}.${fkName} already exists`);
  }
}

async function setupAdmissionDatabase() {
  console.log('Starting robust admission database setup...');

  try {
    // (Optional) quick connectivity test
    await db.promise().query('SELECT 1');

    // Step 1: Add new columns to existing tables (idempotent)
    console.log('Step 1: Adding new columns to existing tables...');
    await ensureColumn('users', 'assigned_building_id', 'BIGINT UNSIGNED NULL');
    await ensureColumn('users', 'assigned_queuegroup_ids', 'TEXT NULL');
    await ensureColumn('queue_customers', 'queuegroup_id', 'BIGINT UNSIGNED NULL');
    await ensureColumn('queue_tickets', 'building_code', 'VARCHAR(64) NULL');
    await ensureColumn('queue_tickets', 'queuegroup_code', 'VARCHAR(64) NULL');

    // Step 2: Create new tables (idempotent)
    console.log('Step 2: Creating new tables...');
    const createTableQueries = [
      `CREATE TABLE IF NOT EXISTS buildings (
        id                BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        code              VARCHAR(64) NOT NULL UNIQUE,
        name              VARCHAR(255) NOT NULL,
        location          VARCHAR(255),
        description       TEXT,
        is_active         TINYINT(1) NOT NULL DEFAULT 1,
        created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_buildings_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
      `CREATE TABLE IF NOT EXISTS queue_groups (
        id                  BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
        code                VARCHAR(64) NOT NULL UNIQUE,
        name                VARCHAR(255) NOT NULL,
        building_id         BIGINT UNSIGNED NOT NULL,
        allowed_service_ids TEXT,
        is_active           TINYINT(1) NOT NULL DEFAULT 1,
        created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        KEY idx_queue_groups_building (building_id),
        KEY idx_queue_groups_active (is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`,
    ];
    for (const q of createTableQueries) {
      await db.promise().query(q);
      const tableName = q.match(/CREATE TABLE IF NOT EXISTS (\w+)/)[1];
      console.log(`= Ensured table: ${tableName}`);
    }

    // Step 3: Add foreign keys (idempotent)
    console.log('Step 3: Adding foreign keys...');
    await ensureForeignKey(
      'queue_groups',
      'fk_queue_groups_building',
      'FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON UPDATE CASCADE ON DELETE RESTRICT'
    );
    await ensureForeignKey(
      'users',
      'fk_users_building',
      'FOREIGN KEY (`assigned_building_id`) REFERENCES `buildings`(`id`) ON UPDATE CASCADE ON DELETE SET NULL'
    );
    await ensureForeignKey(
      'queue_customers',
      'fk_queue_customers_queuegroup',
      'FOREIGN KEY (`queuegroup_id`) REFERENCES `queue_groups`(`id`) ON UPDATE CASCADE ON DELETE SET NULL'
    );

    // Step 4: Seed initial data (idempotent)
    console.log('Step 4: Seeding initial data...');
    const buildingsData = [
      ['MAIN', 'Main Building', 'Downtown', 'Primary campus building'],
      ['ANNEX', 'Annex Building', 'North Campus', 'Secondary building for overflow'],
    ];
    for (const [code, name, location, description] of buildingsData) {
      await db.promise().query(
        'INSERT IGNORE INTO buildings (code, name, location, description, is_active) VALUES (?, ?, ?, ?, 1)',
        [code, name, location, description]
      );
      console.log(`= Ensured building: ${code}`);
    }

    const [buildings] = await db.promise().query(
      'SELECT id, code FROM buildings WHERE code IN (?, ?)',
      ['MAIN', 'ANNEX']
    );
    const buildingMap = Object.fromEntries(buildings.map(b => [b.code, b.id]));

    const queueGroupsData = [
      ['MEMBER', 'Member Services', buildingMap['MAIN'], ''],
      ['NONMEMBER', 'Non-Member Services', buildingMap['MAIN'], '3'],
      ['EXHIBITION', 'Exhibition Services', buildingMap['ANNEX'], ''],
    ];
    for (const [code, name, buildingId, allowedServiceIds] of queueGroupsData) {
      await db.promise().query(
        'INSERT IGNORE INTO queue_groups (code, name, building_id, allowed_service_ids, is_active) VALUES (?, ?, ?, ?, 1)',
        [code, name, buildingId, allowedServiceIds]
      );
      console.log(`= Ensured queue_group: ${code}`);
    }

    // Step 5: Update existing users if missing assignments
    console.log('Step 5: Updating existing users...');
    const [users] = await db.promise().query(
      `SELECT id, username FROM users
       WHERE role = ? AND is_active = 1
         AND (assigned_building_id IS NULL OR assigned_queuegroup_ids IS NULL)`,
      ['CustomerService']
    );

    if (users.length > 0) {
      console.log(`Found ${users.length} users to update`);
      const assignedBuildingId = buildingMap['MAIN'] || null;
      const [allQG] = await db.promise().query('SELECT id, code FROM queue_groups');
      const qgMap = Object.fromEntries(allQG.map(q => [q.code, q.id]));
      const assignedQueuegroupIds = [qgMap['MEMBER'], qgMap['NONMEMBER']].filter(Boolean).join(',');

      for (const u of users) {
        await db.promise().query(
          'UPDATE users SET assigned_building_id = ?, assigned_queuegroup_ids = ? WHERE id = ?',
          [assignedBuildingId, assignedQueuegroupIds || null, u.id]
        );
        console.log(`✓ Updated user: ${u.username}`);
      }
    } else {
      console.log('✓ All users already have assignments');
    }

    console.log('🎉 Admission database setup completed successfully!');
    console.log('\nSummary:');
    console.log('- Ensured columns on users, queue_customers, queue_tickets');
    console.log('- Ensured buildings and queue_groups tables');
    console.log('- Ensured FK constraints');
    console.log('- Seeded buildings and queue groups');
    console.log('- Updated existing users with assignments');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

setupAdmissionDatabase();
