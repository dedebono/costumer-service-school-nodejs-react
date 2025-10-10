const { db } = require('../src/models/db');

async function setupAdmissionDatabase() {
  console.log('Starting robust admission database setup...');

  try {
    // Step 1: Add new columns to existing tables (idempotent)
    console.log('Step 1: Adding new columns to existing tables...');

    const alterQueries = [
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_building_id BIGINT UNSIGNED NULL',
      'ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_queuegroup_ids TEXT NULL',
      'ALTER TABLE queue_customers ADD COLUMN IF NOT EXISTS queuegroup_id BIGINT UNSIGNED NULL',
      'ALTER TABLE queue_tickets ADD COLUMN IF NOT EXISTS building_code VARCHAR(64) NULL',
      'ALTER TABLE queue_tickets ADD COLUMN IF NOT EXISTS queuegroup_code VARCHAR(64) NULL'
    ];

    for (const query of alterQueries) {
      try {
        await db.promise().query(query);
        console.log(`✓ Executed: ${query.split('ADD COLUMN')[1]?.trim() || query}`);
      } catch (e) {
        if (!e.message.includes('Duplicate column name')) {
          console.warn(`Warning for query: ${query}`, e.message);
        } else {
          console.log(`✓ Column already exists: ${query.split('ADD COLUMN')[1]?.trim()}`);
        }
      }
    }

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
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci`
    ];

    for (const query of createTableQueries) {
      try {
        await db.promise().query(query);
        const tableName = query.match(/CREATE TABLE IF NOT EXISTS (\w+)/)?.[1];
        console.log(`✓ Created table: ${tableName}`);
      } catch (e) {
        console.error(`Error creating table:`, e.message);
        throw e;
      }
    }

    // Step 3: Add foreign keys (idempotent)
    console.log('Step 3: Adding foreign keys...');

    const fkQueries = [
      `ALTER TABLE users ADD CONSTRAINT IF NOT EXISTS fk_users_building
        FOREIGN KEY (assigned_building_id) REFERENCES buildings(id)
        ON UPDATE CASCADE ON DELETE SET NULL`,
      `ALTER TABLE queue_customers ADD CONSTRAINT IF NOT EXISTS fk_queue_customers_queuegroup
        FOREIGN KEY (queuegroup_id) REFERENCES queue_groups(id)
        ON UPDATE CASCADE ON DELETE SET NULL`
    ];

    for (const query of fkQueries) {
      try {
        await db.promise().query(query);
        const constraintName = query.match(/ADD CONSTRAINT IF NOT EXISTS (\w+)/)?.[1];
        console.log(`✓ Added constraint: ${constraintName}`);
      } catch (e) {
        if (!e.message.includes('Duplicate foreign key constraint name')) {
          console.warn(`Warning adding FK:`, e.message);
        } else {
          console.log(`✓ Foreign key already exists: ${query.match(/ADD CONSTRAINT IF NOT EXISTS (\w+)/)?.[1]}`);
        }
      }
    }

    // Step 4: Seed initial data (idempotent)
    console.log('Step 4: Seeding initial data...');

    // Seed buildings
    const buildingsData = [
      ['MAIN', 'Main Building', 'Downtown', 'Primary campus building'],
      ['ANNEX', 'Annex Building', 'North Campus', 'Secondary building for overflow']
    ];

    for (const [code, name, location, description] of buildingsData) {
      try {
        await db.promise().query(
          'INSERT IGNORE INTO buildings (code, name, location, description, is_active) VALUES (?, ?, ?, ?, ?)',
          [code, name, location, description, 1]
        );
        console.log(`✓ Inserted building: ${code}`);
      } catch (e) {
        console.error(`Error inserting building ${code}:`, e.message);
      }
    }

    // Get building IDs
    const [buildings] = await db.promise().query('SELECT id, code FROM buildings WHERE code IN (?, ?)', ['MAIN', 'ANNEX']);
    const buildingMap = {};
    buildings.forEach(b => buildingMap[b.code] = b.id);

    // Seed queue groups
    const queueGroupsData = [
      ['MEMBER', 'Member Services', buildingMap['MAIN'], ''],
      ['NONMEMBER', 'Non-Member Services', buildingMap['MAIN'], '3'],
      ['EXHIBITION', 'Exhibition Services', buildingMap['ANNEX'], '']
    ];

    for (const [code, name, buildingId, allowedServiceIds] of queueGroupsData) {
      try {
        await db.promise().query(
          'INSERT IGNORE INTO queue_groups (code, name, building_id, allowed_service_ids, is_active) VALUES (?, ?, ?, ?, ?)',
          [code, name, buildingId, allowedServiceIds, 1]
        );
        console.log(`✓ Inserted queue group: ${code}`);
      } catch (e) {
        console.error(`Error inserting queue group ${code}:`, e.message);
      }
    }

    // Get queue group IDs
    const [queueGroups] = await db.promise().query('SELECT id, code FROM queue_groups');
    const queueGroupMap = {};
    queueGroups.forEach(q => queueGroupMap[q.code] = q.id);

    // Update existing users (only if they don't have assignments)
    console.log('Step 5: Updating existing users...');
    const [users] = await db.promise().query(
      'SELECT id, username FROM users WHERE role = ? AND is_active = 1 AND (assigned_building_id IS NULL OR assigned_queuegroup_ids IS NULL)',
      ['CustomerService']
    );

    if (users.length > 0) {
      console.log(`Found ${users.length} users to update`);
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        const assignedBuildingId = buildingMap['MAIN']; // Assign to MAIN
        const assignedQueuegroupIds = `${queueGroupMap['MEMBER']},${queueGroupMap['NONMEMBER']}`;

        try {
          await db.promise().query(
            'UPDATE users SET assigned_building_id = ?, assigned_queuegroup_ids = ? WHERE id = ?',
            [assignedBuildingId, assignedQueuegroupIds, user.id]
          );
          console.log(`✓ Updated user: ${user.username}`);
        } catch (e) {
          console.error(`Error updating user ${user.username}:`, e.message);
        }
      }
    } else {
      console.log('✓ All users already have assignments');
    }

    console.log('🎉 Admission database setup completed successfully!');
    console.log('\nSummary:');
    console.log('- Added new columns to users, queue_customers, queue_tickets');
    console.log('- Created buildings and queue_groups tables');
    console.log('- Added foreign key constraints');
    console.log('- Seeded initial buildings and queue groups');
    console.log('- Updated existing users with assignments');

  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

setupAdmissionDatabase();
