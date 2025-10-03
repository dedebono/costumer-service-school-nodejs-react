const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  createService,
  getAllServices,
  getServiceById,
  updateService,
  deleteService,
} = require('../models/service');

// All service routes are protected
router.use(verifyToken);

// GET /api/services - Allow CustomerService and Supervisor
router.get('/', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { activeOnly = false } = req.query;
    const services = await getAllServices({ activeOnly: activeOnly === 'true' });
    res.json(services);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// POST /api/services - Supervisor only
router.post('/', requireRole('Supervisor'), async (req, res) => {
  try {
    const { name, codePrefix, isActive = true, slaWarnMinutes = 10, connectionType = 'none' } = req.body;

    if (!name || !codePrefix) {
      return res.status(400).json({ error: 'Name and codePrefix are required' });
    }

    const service = await createService({ name, codePrefix, isActive, slaWarnMinutes, connectionType });
    res.status(201).json(service);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// GET /api/services/:id - Allow CustomerService and Supervisor
router.get('/:id', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const service = await getServiceById(req.params.id);
    if (!service) return res.status(404).json({ error: 'Service not found' });
    res.json(service);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

// PATCH /api/services/:id - Supervisor only
router.patch('/:id', requireRole('Supervisor'), async (req, res) => {
  try {
    const { name, codePrefix, isActive, slaWarnMinutes, connectionType } = req.body;
    const updated = await updateService(req.params.id, { name, codePrefix, isActive, slaWarnMinutes, connectionType });
    if (!updated) return res.status(404).json({ error: 'Service not found' });
    res.json({ message: 'Service updated' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/services/:id - Supervisor only
router.delete('/:id', requireRole('Supervisor'), async (req, res) => {
  try {
    const deleted = await deleteService(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Service not found' });
    res.json({ message: 'Service deleted' });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

module.exports = router;
