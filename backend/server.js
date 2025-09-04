require('dotenv').config();
const express = require('express');
const cors = require('cors');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./docs/openapi');
const authRoutes = require('./src/routes/authRoutes');
const ticketRoutes = require('./src/routes/ticketRoutes');
const userRoutes = require('./src/routes/userRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const passwordResetRoutes = require('./src/routes/passwordResetRoutes');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const app = express();
app.use(cors());
app.use(express.json());

// Swagger (opsional)
if (openapi) {
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(openapi));
}

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/users', userRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/password-resets', passwordResetRoutes);


// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));
app.listen(PORT, HOST, () => {
  console.log(`API running at http://${HOST}:${PORT}`);
});
