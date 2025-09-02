const jwt = require('jsonwebtoken');
const { getUserById } = require('./db');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // Use env variable in production

// Generate JWT token
function generateToken(user) {
    return jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
}

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Middleware for role-based access control
function requireRole(role) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        if (req.user.role !== role && req.user.role !== 'Supervisor') { // Supervisors can access everything
            return res.status(403).json({ error: 'Insufficient permissions' });
        }

        next();
    };
}

// Middleware to check if user is authenticated (for general access)
function requireAuth(req, res, next) {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }
    next();
}

module.exports = {
    generateToken,
    authenticateToken,
    requireRole,
    requireAuth
};
