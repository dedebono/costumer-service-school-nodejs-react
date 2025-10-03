require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const swaggerUi = require('swagger-ui-express');
const openapi = require('./docs/openapi');
const authRoutes = require('./src/routes/authRoutes');
const ticketRoutes = require('./src/routes/ticketRoutes');
const userRoutes = require('./src/routes/userRoutes');
const customerRoutes = require('./src/routes/customerRoutes');
const passwordResetRoutes = require('./src/routes/passwordResetRoutes');
const admissionRoutes = require('./src/routes/admissionRoutes');
const queueRoutes = require('./src/routes/queueRoutes');
const serviceRoutes = require('./src/routes/serviceRoutes');
const counterRoutes = require('./src/routes/counterRoutes');
const kioskRoutes = require('./src/routes/kioskRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

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
app.use('/api/admission', admissionRoutes);
app.use('/api/queue', queueRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/counters', counterRoutes);
app.use('/api/kiosk', kioskRoutes);
app.use('/api/admin', adminRoutes);


// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Create HTTP server and Socket.IO
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  // Join room for queue updates
  socket.on('join-queue', (serviceId) => {
    socket.join(`queue-${serviceId}`);
    console.log(`Client ${socket.id} joined queue-${serviceId}`);
  });

  // Leave room
  socket.on('leave-queue', (serviceId) => {
    socket.leave(`queue-${serviceId}`);
    console.log(`Client ${socket.id} left queue-${serviceId}`);
  });

  // Join notifications room
  socket.on('join-notifications', () => {
    socket.join('notifications');
    console.log(`Client ${socket.id} joined notifications`);
  });

  // Join ticket room
  socket.on('join-ticket', (ticketId) => {
    socket.join(`ticket-${ticketId}`);
    console.log(`Client ${socket.id} joined ticket-${ticketId}`);
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Make io available to routes (for emitting events)
app.set('io', io);

// Function to emit queue updates
global.emitQueueUpdate = (serviceId, data) => {
  io.to(`queue-${serviceId}`).emit('queue-update', data);
};

// Function to emit ticket updates
global.emitTicketUpdate = (ticketId, data) => {
  io.to(`ticket-${ticketId}`).emit('ticket-update', data);
};

server.listen(PORT, HOST, () => {
  console.log(`API running at http://${HOST}:${PORT}`);
});
