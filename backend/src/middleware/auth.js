const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
const authHeader = req.headers['authorization'];
const token = authHeader && authHeader.split(' ')[0] === 'Bearer' ? authHeader.split(' ')[1] : null;
if (!token) return res.status(401).json({ error: 'Missing Bearer token' });


try {
const secret = process.env.JWT_SECRET;
if (!secret && process.env.NODE_ENV === 'production') {
return res.status(500).json({ error: 'Server misconfigured: JWT_SECRET not set' });
}
req.user = jwt.verify(token, secret || 'dev-secret-only');
next();
} catch (e) {
return res.status(401).json({ error: 'Invalid token' });
}
}


function requireRole(required) {
const requiredRoles = Array.isArray(required) ? required : [required];
return (req, res, next) => {
if (!req.user) return res.status(401).json({ error: 'Authentication required' });
// Supervisor bypass
if (req.user.role === 'Supervisor') return next();
if (!requiredRoles.includes(req.user.role)) {
return res.status(403).json({ error: 'Insufficient permissions' });
}
next();
};
}


function generateToken(user) {
const secret = process.env.JWT_SECRET || 'dev-secret-only';
const payload = { id: user.id, username: user.username, role: user.role };
return jwt.sign(payload, secret, { expiresIn: '12h' });
}


module.exports = { verifyToken, requireRole, generateToken };