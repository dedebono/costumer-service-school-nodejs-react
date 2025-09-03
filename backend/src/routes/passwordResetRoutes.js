const router = require('express').Router();
const bcrypt = require('bcrypt');
const { verifyToken, requireRole } = require('../middleware/auth');
const {
  createResetRequest,
  getPendingRequestForUser,
  getRequestById,
  approveRequest,
  getRequestByToken,
  markRequestAsCompleted,
} = require('../models/passwordReset');
const { updateUser } = require('../models/user');

// All routes are protected
router.use(verifyToken);

// POST /api/password-resets/request (User requests a reset for themselves)
router.post('/request', async (req, res) => {
  try {
    const userId = req.user.id;

    // Check if user already has a pending request
    const existing = await getPendingRequestForUser(userId);
    if (existing) {
      return res.status(409).json({ error: 'You already have a pending password reset request.' });
    }

    const request = await createResetRequest(userId);
    res.status(201).json({ message: 'Password reset requested. A supervisor must approve it.', requestId: request.id });
  } catch (e) {
    res.status(500).json({ error: 'Failed to request password reset.', details: e.message });
  }
});

// POST /api/password-resets/:id/approve (Supervisor approves a request)
router.post('/:id/approve', requireRole('Supervisor'), async (req, res) => {
  try {
    const requestId = req.params.id;
    const supervisorId = req.user.id;

    const request = await getRequestById(requestId);
    if (!request) {
        return res.status(404).json({ error: 'Request not found.' });
    }
    if (request.status !== 'pending') {
        return res.status(400).json({ error: `Request has already been ${request.status}.` });
    }

    const { token } = await approveRequest(requestId, supervisorId);
    // In a real app, you would email this token or notify the user through a secure channel.
    // For now, we return it directly for simplicity.
    res.json({ message: 'Request approved. User can now reset their password with this token.', resetToken: token });
  } catch (e) {
    res.status(500).json({ error: 'Failed to approve request.', details: e.message });
  }
});

// POST /api/password-resets/reset (User finalizes the reset)
router.post('/reset', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            return res.status(400).json({ error: 'Token and newPassword are required.' });
        }

        const request = await getRequestByToken(token);
        if (!request) {
            return res.status(400).json({ error: 'Invalid or expired token.' });
        }

        // Hash the new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        // Update the user's password
        await updateUser(request.user_id, { passwordHash });

        // Mark the request as completed to prevent token reuse
        await markRequestAsCompleted(request.id);

        res.json({ message: 'Password has been reset successfully.' });

    } catch (e) {
        res.status(500).json({ error: 'Failed to reset password.', details: e.message });
    }
});


module.exports = router;
