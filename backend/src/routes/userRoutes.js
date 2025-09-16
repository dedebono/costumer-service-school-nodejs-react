const router = require('express').Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

const upload = multer({ dest: 'uploads/' });
const bcrypt = require('bcrypt');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
} = require('../models/user');

router.use(verifyToken);

// GET /api/users  (List)
router.get('/', requireRole('Supervisor'), async (_req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users  (Create)
router.post('/',  async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'username, email, password are required' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await createUser({ username, email, passwordHash, role: role || 'CustomerService' });
    return res.status(201).json({ message: 'User created', user });
  } catch (e) {
    return res.status(400).json({ error: e.message });
  }
});

// GET /api/users/:id  (Read one)
router.get('/:id', requireRole('Supervisor'), async (req, res) => {
  try {
    const user = await getUserById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// PATCH /api/users/:id  (Update)
router.patch('/:id', requireRole('Supervisor'), async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    let passwordHash;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    const updated = await updateUser(req.params.id, { username, email, role, passwordHash });
    if (!updated) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User updated' });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// DELETE /api/users/:id  (Delete)
router.delete('/:id', requireRole('Supervisor'), async (req, res) => {
  try {
    const ok = await deleteUser(req.params.id);
    if (!ok) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

router.post('/bulk', requireRole('Supervisor'), upload.single('file'), async (req, res) => {
  const results = [];
  const errors = [];

  fs.createReadStream(req.file.path)
    .pipe(csv())
    .on('data', (data) => results.push(data))
    .on('end', async () => {
      for (const user of results) {
        try {
          const { username, email, password, role } = user;
          if (!username || !email || !password) {
            errors.push({ user, error: 'Missing required fields' });
            continue;
          }
          const passwordHash = await bcrypt.hash(password, 10);
          await createUser({ username, email, passwordHash, role: role || 'CustomerService' });
        } catch (error) {
          errors.push({ user, error: error.message });
        }
      }

      fs.unlinkSync(req.file.path); // Clean up uploaded file

      res.status(200).json({ 
        message: 'Bulk user import completed', 
        successCount: results.length - errors.length,
        errorCount: errors.length,
        errors,
      });
    });
});

module.exports = router;
