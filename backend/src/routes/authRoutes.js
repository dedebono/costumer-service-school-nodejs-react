const router = require('express').Router();
const bcrypt = require('bcrypt');
const { createUser, authenticateUser } = require('../models/user');
const { generateToken, verifyToken } = require('../middleware/auth');

// This endpoint will be used to verify the token on the frontend
router.get('/me', verifyToken, (req, res) => {
  res.status(200).json({ user: req.user });
});

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
    console.log('[LOGIN] body:', req.body);

    if (!email || !password) {
      console.warn('[LOGIN] Missing email/password');
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await authenticateUser(email, password);
    if (!user) {
      console.warn('[LOGIN] Invalid credentials for email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    console.log('[LOGIN] Authenticated user:', { id: user.id, username: user.username, role: user.role });

    let token;
    try {
      token = generateToken(user);
      console.log('[LOGIN] Token generated for user id:', user.id);
    } catch (e) {
      console.error('[LOGIN] JWT sign failed:', e);
      return res.status(500).json({ error: 'Token generation failed' });
    }

    // Defensive: pastikan field ada dan bukan circular
    const payloadUser = {
      id: user.id ?? null,
      username: user.username ?? null,
      role: user.role ?? null,
    };

    // Kirim response
    return res.status(200).json({ token, user: payloadUser });
  } catch (e) {
    // log stack lengkap biar kelihatan sumbernya
    console.error('[LOGIN] Error stack:\n', e && e.stack ? e.stack : e);
    return res.status(500).json({ error: 'Login failed' });
  }
});


module.exports = router;
