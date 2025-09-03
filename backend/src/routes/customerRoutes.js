// src/routes/customerRoutes.js
const router = require('express').Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  createCustomer,
  getAllCustomers,
  getCustomerById,
  updateCustomer,
  deleteCustomer,
  searchCustomers,
} = require('../models/customer');

// All customer routes are protected
router.use(verifyToken);

// IMPORTANT: put /search BEFORE /:id so it's not captured by :id
router.get('/search', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { name = '', phone = '', limit = '20', offset = '0' } = req.query;
    if (!name && !phone) return res.json([]); // no filters → empty list
    const rows = await searchCustomers({
      name,
      phone,
      limit: Math.min(parseInt(limit, 10) || 20, 100),
      offset: Math.max(parseInt(offset, 10) || 0, 0),
    });
    res.json(rows);
  } catch (e) {
    res.status(500).json({ error: 'Failed to search customers' });
  }
});

// GET /api/customers
router.get('/', requireRole(['CustomerService', 'Supervisor']), async (_req, res) => {
  try {
    const customers = await getAllCustomers();
    res.json(customers);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

// POST /api/customers
router.post('/', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const customer = await createCustomer({ name, email, phone });
    res.status(201).json(customer);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// GET /api/customers/:id
router.get('/:id', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const customer = await getCustomerById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch customer' });
  }
});

// PATCH /api/customers/:id
router.patch('/:id', requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
  try {
    const { name, email, phone } = req.body;
    const updated = await updateCustomer(req.params.id, { name, email, phone });
    if (!updated) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer updated' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/customers/:id
router.delete('/:id', requireRole('Supervisor'), async (req, res) => {
  try {
    const deleted = await deleteCustomer(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Customer not found' });
    res.json({ message: 'Customer deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete customer' });
  }
});

module.exports = router;
