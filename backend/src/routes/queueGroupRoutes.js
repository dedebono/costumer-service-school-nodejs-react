const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  createQueueGroup,
  getAllQueueGroups,
  getQueueGroupById,
  updateQueueGroup,
  deleteQueueGroup,
} = require('../models/queueGroup');

// All queue group routes are protected
router.use(verifyToken);

// GET /api/queue-groups - Get all queue groups
router.get('/', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { activeOnly = true, buildingId } = req.query;
    const queueGroups = await getAllQueueGroups({
      activeOnly: activeOnly === 'true',
      buildingId: buildingId ? parseInt(buildingId) : undefined
    });
    res.json(queueGroups);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch queue groups' });
  }
});

// GET /api/queue-groups/:id - Get queue group by ID
router.get('/:id', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const queueGroup = await getQueueGroupById(req.params.id);
    if (!queueGroup) return res.status(404).json({ error: 'Queue group not found' });
    res.json(queueGroup);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch queue group' });
  }
});

// POST /api/queue-groups - Create new queue group
router.post('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const { code, name, buildingId, allowedServiceIds, isActive } = req.body;
    const queueGroup = await createQueueGroup({ code, name, buildingId, allowedServiceIds, isActive });
    res.status(201).json(queueGroup);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/queue-groups/:id - Update queue group
router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const { code, name, buildingId, allowedServiceIds, isActive } = req.body;
    await updateQueueGroup(req.params.id, { code, name, buildingId, allowedServiceIds, isActive });
    res.json({ message: 'Queue group updated successfully' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/queue-groups/:id - Delete queue group
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    await deleteQueueGroup(req.params.id);
    res.json({ message: 'Queue group deleted successfully' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
