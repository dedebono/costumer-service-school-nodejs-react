const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  createBuilding,
  getAllBuildings,
  getBuildingById,
  updateBuilding,
  deleteBuilding,
} = require('../models/building');

// All building routes are protected
router.use(verifyToken);

// GET /api/buildings - Get all buildings
router.get('/', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { activeOnly = true } = req.query;
    const buildings = await getAllBuildings({ activeOnly: activeOnly === 'true' });
    res.json(buildings);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch buildings' });
  }
});

// GET /api/buildings/:id - Get building by ID
router.get('/:id', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const building = await getBuildingById(req.params.id);
    if (!building) return res.status(404).json({ error: 'Building not found' });
    res.json(building);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch building' });
  }
});

// POST /api/buildings - Create new building
router.post('/', requireRole('ADMIN'), async (req, res) => {
  try {
    const { code, name, location, description, isActive } = req.body;
    const building = await createBuilding({ code, name, location, description, isActive });
    res.status(201).json(building);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// PUT /api/buildings/:id - Update building
router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const { code, name, location, description, isActive } = req.body;
    await updateBuilding(req.params.id, { code, name, location, description, isActive });
    res.json({ message: 'Building updated successfully' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/buildings/:id - Delete building
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    await deleteBuilding(req.params.id);
    res.json({ message: 'Building deleted successfully' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
