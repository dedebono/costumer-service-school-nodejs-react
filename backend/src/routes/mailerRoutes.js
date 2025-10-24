const router = require('express').Router();
const nodemailer = require('nodemailer');

const createTransporter = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST,          // smtp-relay.brevo.com
    port: Number(process.env.EMAIL_PORT),  // 587
    secure: Number(process.env.EMAIL_PORT) === 465,
    auth: {
      user: process.env.EMAIL_USER,        // your Brevo login email
      pass: process.env.EMAIL_PASS,        // Brevo SMTP key
    },
    // optional but helpful
    requireTLS: true,
  });

router.post('/test-send', async (req, res) => {
  try {
    const { to, subject, text, html } = req.body;
    if (!to || !subject || (!text && !html)) {
      return res.status(400).json({ error: 'Missing to, subject, and text or html' });
    }

    const transporter = createTransporter();
    await transporter.verify(); // checks connection/auth only

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM,        // e.g. "HBICS App <noreply@ytcb.org>"
      to,
      subject,
      text,
      html,
      // replyTo: 'support@ytcb.org',     // optional
    });

    res.status(200).json({
      message: 'Email sent',
      id: info.messageId,
      envelope: info.envelope,
      response: info.response,
    });
  } catch (error) {
    console.error('Brevo SMTP send error:', error);
    res.status(500).json({ error: error.message, code: error.code, command: error.command, response: error.response });
  }
});

module.exports = router;
