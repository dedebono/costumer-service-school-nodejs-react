const { db } = require('../src/models/db');
const { createBuilding } = require('../src/models/building');
const { createQueueGroup } = require('../src/models/queueGroup');
const { getAllServices } = require('../src/models/service');
const { updateUser } = require('../src/models/user');

async function seedAdmissionData() {
  try {
    console.log('Seeding admission data...');

    // Create buildings
    const building1 = await createBuilding({
      code: 'MAIN',
      name: 'Main Building',
      location: 'Downtown',
      description: 'Primary campus building'
    });
    console.log('Created building:', building1);

    const building2 = await createBuilding({
      code: 'ANNEX',
      name: 'Annex Building',
      location: 'North Campus',
      description: 'Secondary building for overflow'
    });
    console.log('Created building:', building2);

    // Get all services
    const services = await getAllServices({ activeOnly: true });
    console.log('Active services:', services.length);

    // Create queue groups
    const memberGroup = await createQueueGroup({
      code: 'MEMBER',
      name: 'Member Services',
      buildingId: building1.id,
      allowedServiceIds: services.filter(s => s.code_prefix.startsWith('M')).map(s => s.id).join(',')
    });
    console.log('Created queue group:', memberGroup);

    const nonMemberGroup = await createQueueGroup({
      code: 'NONMEMBER',
      name: 'Non-Member Services',
      buildingId: building1.id,
      allowedServiceIds: services.filter(s => s.code_prefix.startsWith('N')).map(s => s.id).join(',')
    });
    console.log('Created queue group:', nonMemberGroup);

    const exhibitionGroup = await createQueueGroup({
      code: 'EXHIBITION',
      name: 'Exhibition Services',
      buildingId: building2.id,
      allowedServiceIds: services.filter(s => s.code_prefix.startsWith('E')).map(s => s.id).join(',')
    });
    console.log('Created queue group:', exhibitionGroup);

    // Assign buildings and queue groups to users
    // Get all CustomerService users
    const [users] = await db.query('SELECT id, username FROM users WHERE role = ? AND is_active = 1', ['CustomerService']);
    console.log('CustomerService users:', users.length);

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      // Assign alternating buildings
      const assignedBuildingId = i % 2 === 0 ? building1.id : building2.id;
      // Assign queue groups based on building
      const assignedQueuegroupIds = assignedBuildingId === building1.id
        ? `${memberGroup.id},${nonMemberGroup.id}`
        : `${exhibitionGroup.id}`;

      await updateUser(user.id, {
        assignedBuildingId,
        assignedQueuegroupIds
      });
      console.log(`Updated user ${user.username}: building ${assignedBuildingId}, queuegroups ${assignedQueuegroupIds}`);
    }

    console.log('Admission data seeded successfully!');
  } catch (error) {
    console.error('Error seeding admission data:', error);
  } finally {
    process.exit(0);
  }
}

seedAdmissionData();
