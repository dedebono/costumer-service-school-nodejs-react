const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  createTicket,
  getTicketById,
  updateTicketStatus,
  deleteTicket,
  enqueueTicket,
  getAllTickets,          // <<— TAMBAHKAN INI
} = require('../models/ticket');

// Semua route tiket butuh auth
router.use(verifyToken);

// GET /api/tickets  (List + filter + pagination)
router.get('/', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { status, priority, q, sortBy, sortDir, page = '1', pageSize = '20', createdBy } = req.query;
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const ps = Math.min(Math.max(parseInt(pageSize, 10) || 20, 1), 100);
    const offset = (p - 1) * ps;

    const result = await getAllTickets({
      status,
      priority,
      q,
      sortBy,
      sortDir,
      limit: ps,
      offset,
      createdBy: createdBy ? Number(createdBy) : undefined,
    });

    res.json({
      data: result.rows,
      pagination: {
        total: result.total,
        page: p,
        pageSize: ps,
        pages: Math.ceil(result.total / ps),
      },
    });
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch tickets', details: e.message });
  }
});

// POST /api/tickets
router.post('/', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { title, description, priority, customerId } = req.body; // ← include customerId
    const ticket = await createTicket({ title, description, priority, createdBy: req.user.id, customerId: customerId ?? null });
    await enqueueTicket(ticket.id);
    res.status(201).json(ticket);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/tickets/:id
router.get('/:id', async (req, res) => {
  const ticket = await getTicketById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  res.json(ticket);
});

// PATCH /api/tickets/:id/status
router.patch('/:id/status', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { status } = req.body;
    await updateTicketStatus(req.params.id, status, req.user.id);
    res.json({ message: 'Status updated' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/tickets/:id
router.delete('/:id', requireRole('Supervisor'), async (req, res) => {
  try {
    await deleteTicket(req.params.id);
    res.json({ message: 'Ticket deleted' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
