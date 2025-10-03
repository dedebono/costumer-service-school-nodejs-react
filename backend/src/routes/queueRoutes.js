const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getQueueTicketById,
  getQueueByService,
  claimTicket,
  startService,
  resolveTicket,
  requeueTicket,
  markNoShow,
  cancelTicket,
  getQueueStatus,
} = require('../models/queueTicket');
const {
  createSupportTicket,
  getSupportTicketsByQueueTicket,
} = require('../models/supportTicket');

// All queue routes are protected
router.use(verifyToken);

// GET /api/queue/:serviceId - Get queue for a service
router.get('/:serviceId', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { status, limit = 50 } = req.query;

    const tickets = await getQueueByService(serviceId, { status, limit: parseInt(limit) });
    res.json(tickets);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch queue' });
  }
});

// GET /api/queue/:serviceId/status - Get queue status counts
router.get('/:serviceId/status', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { serviceId } = req.params;
    const status = await getQueueStatus(serviceId);
    res.json(status);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch queue status' });
  }
});

// GET /api/queue/ticket/:id - Get specific queue ticket
router.get('/ticket/:id', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const ticket = await getQueueTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Queue ticket not found' });
    res.json(ticket);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch queue ticket' });
  }
});

// POST /api/queue/ticket/:id/claim - Claim a ticket
router.post('/ticket/:id/claim', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { id } = req.params;
    const claimedBy = req.user.id;

    await claimTicket(id, claimedBy);
    res.json({ message: 'Ticket claimed successfully' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// POST /api/queue/ticket/:id/start - Start service for a ticket
router.post('/ticket/:id/start', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { id } = req.params;

    await startService(id);
    res.json({ message: 'Service started' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// POST /api/queue/ticket/:id/resolve - Resolve a ticket
router.post('/ticket/:id/resolve', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    await resolveTicket(id, notes);
    res.json({ message: 'Ticket resolved' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// POST /api/queue/ticket/:id/requeue - Requeue a ticket
router.post('/ticket/:id/requeue', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    await requeueTicket(id, notes);
    res.json({ message: 'Ticket requeued' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// POST /api/queue/ticket/:id/no-show - Mark ticket as no-show
router.post('/ticket/:id/no-show', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { id } = req.params;

    await markNoShow(id);
    res.json({ message: 'Ticket marked as no-show' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// POST /api/queue/ticket/:id/cancel - Cancel a ticket
router.post('/ticket/:id/cancel', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    await cancelTicket(id, notes);
    res.json({ message: 'Ticket canceled' });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// POST /api/queue/ticket/:id/support - Create support ticket for queue ticket
router.post('/ticket/:id/support', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { id } = req.params;
    const { summary, details, category, attachmentsJson } = req.body;
    const createdBy = req.user.id;

    const supportTicket = await createSupportTicket({
      queueTicketId: id,
      summary,
      details,
      category,
      attachmentsJson,
      createdBy,
    });

    res.status(201).json(supportTicket);
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// GET /api/queue/ticket/:id/support - Get support tickets for queue ticket
router.get('/ticket/:id/support', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const supportTickets = await getSupportTicketsByQueueTicket(req.params.id);
    res.json(supportTickets);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

module.exports = router;
