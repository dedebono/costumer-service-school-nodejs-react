// src/routes/customerRoutes.js
const router = require('express').Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });
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
router.get(
  '/search',
  requireRole(['CustomerService', 'Supervisor']),
  async (req, res) => {
    try {
      let { name = '', phone = '', email = '', limit = '20', offset = '0' } = req.query;

      name  = String(name).trim();
      // normalize phone to digits-only
      const phoneRaw = String(phone).trim();
      const phoneDigits = phoneRaw.replace(/\D/g, '');
      email = String(email).trim().toLowerCase();

      // no filters → empty list
      if (!name && !phoneDigits && !email) return res.json([]);

      // validation (matches your frontend rules: 11–12 digits)
      if (phoneDigits && !/^\d{11,12}$/.test(phoneDigits)) {
        return res.status(400).json({ error: 'Phone must be 11–12 digits.' });
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Invalid email.' });
      }

      const rows = await searchCustomers({
        name,
        phone: phoneDigits, // pass normalized digits to model
        email,
        limit: Math.min(parseInt(limit, 10) || 20, 100),
        offset: Math.max(parseInt(offset, 10) || 0, 0),
      });

      res.json(rows);
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Failed to search customers' });
    }
  }
);

// GET /api/customers
router.get('/', requireRole(['CustomerService', 'Supervisor']), async (_req, res) => {
  try {
    const customers = await getAllCustomers();
    res.json(customers);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

router.post('/', requireRole(['CustomerService','Supervisor']), async (req, res) => {
  try {
    const name  = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim();

    if (!name || !email) return res.status(400).json({ error: 'Name and email are required.' });

    // Optional: pre-check to give a nicer error (avoids relying on DB error message)
    const existing = await searchCustomers({ email, limit: 1, offset: 0 });
    if (existing && existing.length) {
      return res.status(409).json({ error: 'Email already exists', customer: existing[0] });
    }

    const customer = await createCustomer({ name, email, phone });
    res.status(201).json(customer);

  } catch (e) {
    // Map SQLite duplicate to 409
    if (e && (e.code === 'SQLITE_CONSTRAINT' || String(e.message).includes('UNIQUE constraint failed: customers.email'))) {
      return res.status(409).json({ error: 'Email already exists' });
    }
    console.error(e);
    res.status(400).json({ error: 'Failed to create customer' });
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

router.post('/bulk', requireRole(['CustomerService', 'Supervisor']), upload.single('file'), async (req, res) => {
  console.log('Bulk upload request received');
  const results = [];
  const errors = [];

  if (!req.file) {
    console.log('No file found in request');
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  console.log('File received:', req.file);

  fs.createReadStream(req.file.path)
    .pipe(csv({
      mapHeaders: ({ header }) => header.toLowerCase()
    }))
    .on('data', (data) => {
      console.log('CSV data row:', data);
      results.push(data);
    })
    .on('end', async () => {
      console.log('CSV processing finished. Starting data import.');
      for (const customer of results) {
        try {
          const { name, email, phone } = customer;
          if (!name || !email) {
            errors.push({ customer, error: 'Missing required fields' });
            continue;
          }
          console.log('Creating customer:', { name, email, phone });
          await createCustomer({ name, email, phone });
        } catch (error) {
          console.log('Error creating customer:', { customer, error: error.message });
          errors.push({ customer, error: error.message });
        }
      }

      fs.unlinkSync(req.file.path); // Clean up uploaded file
      console.log('File processing complete. Sending response.');

      res.status(200).json({ 
        message: 'Bulk customer import completed', 
        successCount: results.length - errors.length,
        errorCount: errors.length,
        errors,
      });
    });
});

module.exports = router;
