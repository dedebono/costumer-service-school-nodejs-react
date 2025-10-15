const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  createCounter,
  getAllCounters,
  getCounterById,
  updateCounter,
  deleteCounter,
} = require('../models/counter');

// All counter routes are protected and require CustomerService or Supervisor role
router.use(verifyToken);
router.use(requireRole(['CustomerService', 'Supervisor']));

// GET /api/counters
router.get('/', async (req, res) => {
  try {
    const { activeOnly = false } = req.query;
    const counters = await getAllCounters({ activeOnly: activeOnly === 'true' });
    res.json(counters);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch counters' });
  }
});

// POST /api/counters
router.post('/', async (req, res) => {
  try {
    const { name, allowedServiceIds, isActive = true } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const counter = await createCounter({ name, allowedServiceIds, isActive });
    res.status(201).json(counter);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// GET /api/counters/:id
router.get('/:id', async (req, res) => {
  try {
    const counter = await getCounterById(req.params.id);
    if (!counter) return res.status(404).json({ error: 'Counter not found' });
    res.json(counter);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch counter' });
  }
});

// PATCH /api/counters/:id
router.patch('/:id', async (req, res) => {
  try {
    const { name, allowedServiceIds, isActive } = req.body;
    const updated = await updateCounter(req.params.id, { name, allowedServiceIds, isActive });
    if (!updated) return res.status(404).json({ error: 'Counter not found' });
    res.json({ message: 'Counter updated' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/counters/:id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await deleteCounter(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Counter not found' });
    res.json({ message: 'Counter deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete counter' });
  }
});

module.exports = router;
