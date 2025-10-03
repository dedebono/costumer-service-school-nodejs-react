const router = require('express').Router();
const {
  createQueueTicket,
} = require('../models/queueTicket');
const {
  findOrCreateCustomerByPhone,
} = require('../models/customer');
const {
  getAllServices,
} = require('../models/service');

// Kiosk routes are public (no auth required for customer intake)

// GET /api/kiosk/services - Get active services for kiosk
router.get('/services', async (req, res) => {
  try {
    const services = await getAllServices({ activeOnly: true });
    res.json(services);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// POST /api/kiosk/ticket - Create queue ticket for customer
router.post('/ticket', async (req, res) => {
  try {
    const { name, email, phone, serviceId, notes } = req.body;

    if (!phone || !serviceId) {
      return res.status(400).json({ error: 'Phone and serviceId are required' });
    }

    // Find or create customer
    const customer = await findOrCreateCustomerByPhone({ name, email, phone });

    // Create queue ticket
    const queueTicket = await createQueueTicket({
      serviceId,
      customerId: customer.id,
      notes,
    });

    // Emit queue update to specific service room and notifications room
    global.emitQueueUpdate(serviceId, { serviceId, serviceName: queueTicket.service_name });
    const io = req.app.get('io');
    io.to('notifications').emit('queue-update', { serviceId, serviceName: queueTicket.service_name });

    res.status(201).json({
      ticket: queueTicket,
      customer: customer,
      message: 'Queue ticket created successfully',
    });
  } catch (e) {
    console.error(e);
    res.status(400).json({ error: e.message });
  }
});

// GET /api/kiosk/ticket/:id - Get queue ticket status (for customer display)
router.get('/ticket/:id', async (req, res) => {
  try {
    const { getQueueTicketById } = require('../models/queueTicket');
    const ticket = await getQueueTicketById(req.params.id);
    if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

    // Return limited info for public display
    res.json({
      id: ticket.id,
      number: ticket.number,
      status: ticket.status,
      created_at: ticket.created_at,
      service_name: ticket.service_name,
      estimated_wait: null, // Could calculate based on queue position
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to fetch ticket' });
  }
});

module.exports = router;
