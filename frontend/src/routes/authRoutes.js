const router = require('express').Router();
const bcrypt = require('bcrypt');
const { createUser, authenticateUser } = require('../models/user');
const { generateToken } = require('../middleware/auth');


// POST /api/auth/register
router.post('/register', async (req, res) => {
try {
const { username, email, password, role } = req.body;
if (!username || !email || !password) return res.status(400).json({ error: 'Username, email, and password are required' });
const passwordHash = await bcrypt.hash(password, 10);
const user = await createUser({ username, email, passwordHash, role: role || 'CustomerService' });
return res.status(201).json({ message: 'User registered successfully', userId: user.id });
} catch (e) {
return res.status(400).json({ error: e.message });
}
});


// POST /api/auth/login
router.post('/login', async (req, res) => {
try {
const { email, password } = req.body;
if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });
const user = await authenticateUser(email, password);
if (!user) return res.status(401).json({ error: 'Invalid credentials' });
const token = generateToken(user);
return res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
} catch (e) {
return res.status(500).json({ error: 'Login failed' });
}
});


module.exports = router;