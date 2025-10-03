const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getSetting,
  setSetting,
  getAllSettings,
} = require('../models/setting');
const {
  getAllSupportTickets,
} = require('../models/supportTicket');

// All admin routes are protected and require Supervisor role
router.use(verifyToken);
router.use(requireRole('Supervisor'));

// GET /api/admin/settings
router.get('/settings', async (req, res) => {
  try {
    const settings = await getAllSettings();
    res.json(settings);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// GET /api/admin/settings/:key
router.get('/settings/:key', async (req, res) => {
  try {
    const value = await getSetting(req.params.key);
    if (value === null) return res.status(404).json({ error: 'Setting not found' });
    res.json({ key: req.params.key, value });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

// PUT /api/admin/settings/:key
router.put('/settings/:key', async (req, res) => {
  try {
    const { value } = req.body;
    if (value === undefined) {
      return res.status(400).json({ error: 'Value is required' });
    }

    await setSetting(req.params.key, value);
    res.json({ message: 'Setting updated' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// GET /api/admin/reports/support-tickets - Support tickets report
router.get('/reports/support-tickets', async (req, res) => {
  try {
    const {
      status,
      category,
      q,
      sortBy = 'created_at',
      sortDir = 'DESC',
      limit = 50,
      offset = 0,
    } = req.query;

    const result = await getAllSupportTickets({
      status,
      category,
      q,
      sortBy,
      sortDir,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json(result);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch support tickets report' });
  }
});

// GET /api/admin/reports/queue-stats - Queue statistics (placeholder)
router.get('/reports/queue-stats', async (req, res) => {
  try {
    // This would aggregate queue statistics
    // For now, return placeholder
    res.json({
      totalTickets: 0,
      averageWaitTime: 0,
      serviceBreakdown: [],
      message: 'Queue statistics not yet implemented',
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch queue statistics' });
  }
});

module.exports = router;
