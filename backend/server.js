const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const {
    createCustomer,
    createTicket,
    getTickets,
    getTicketById,
    updateTicketStatus,
    updateTicket,
    getQueueTickets,
    removeTicketFromQueue,
    getTicketHistory,
    createUser,
    authenticateUser,
    getUsers,
    deleteUser,
    deleteTicket
} = require('./db');
const { generateToken, authenticateToken, requireRole, requireAuth } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Swagger setup
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Customer Service API',
            version: '1.0.0',
            description: 'API for customer service queue and ticketing system',
        },
        servers: [
            {
                url: 'http://localhost:3001',
                description: 'Development server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                },
            },
        },
        security: [
            {
                bearerAuth: [],
            },
        ],
    },
    apis: ['./server.js'], // Path to the API docs
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

/**
 * @swagger
 * /api/health:
 *   get:
 *     summary: Health check endpoint
 *     description: Returns the health status of the API
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: OK
 *                 message:
 *                   type: string
 *                   example: Customer Service API is running
 */
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Customer Service API is running' });
});

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     description: Creates a new user account
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: john_doe
 *               password:
 *                 type: string
 *                 example: password123
 *               role:
 *                 type: string
 *                 enum: [CustomerService, Supervisor]
 *                 default: CustomerService
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *                 userId:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const userId = await createUser({ username, password: hashedPassword, role: role || 'CustomerService' });
        res.status(201).json({ message: 'User registered successfully', userId });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     description: Authenticates a user and returns a JWT token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: john_doe
 *               password:
 *                 type: string
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     username:
 *                       type: string
 *                       example: john_doe
 *                     role:
 *                       type: string
 *                       example: CustomerService
 *       400:
 *         description: Bad request
 *       401:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required' });
        }
        const user = await authenticateUser(username, password);
        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }
        const token = generateToken(user);
        res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: User logout
 *     description: Logs out the user (client-side token removal)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       401:
 *         description: Unauthorized
 */
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    // For JWT, logout is handled client-side by removing the token
    // Server-side, we just confirm the logout
    res.json({ message: 'Logged out successfully' });
});

/**
 * @swagger
 * /api/tickets:
 *   post:
 *     summary: Create a new ticket
 *     description: Creates a new customer service ticket
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customerName
 *               - customerEmail
 *               - title
 *             properties:
 *               customerName:
 *                 type: string
 *                 example: John Doe
 *               customerEmail:
 *                 type: string
 *                 example: john.doe@example.com
 *               customerPhone:
 *                 type: string
 *                 example: +1234567890
 *               title:
 *                 type: string
 *                 example: Issue with product
 *               description:
 *                 type: string
 *                 example: Detailed description of the issue
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 default: medium
 *               category:
 *                 type: string
 *                 example: Technical Support
 *     responses:
 *       201:
 *         description: Ticket created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ticket created successfully
 *                 ticketId:
 *                   type: integer
 *                   example: 1
 *                 customerId:
 *                   type: integer
 *                   example: 1
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
app.post('/api/tickets', authenticateToken, async (req, res) => {
    try {
        const { customerName, customerEmail, customerPhone, title, description, priority, category } = req.body;

        // Validate required fields
        if (!customerName || !customerEmail || !title) {
            return res.status(400).json({ error: 'Customer name, email, and ticket title are required' });
        }

        // Create or get customer
        const customer = await createCustomer({
            name: customerName,
            email: customerEmail,
            phone: customerPhone
        });

        // Create ticket
        const ticketId = await createTicket({
            customerId: customer.id,
            title,
            description,
            priority: priority || 'medium',
            category
        });

        res.status(201).json({
            message: 'Ticket created successfully',
            ticketId,
            customerId: customer.id
        });
    } catch (error) {
        console.error('Error creating ticket:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/tickets:
 *   get:
 *     summary: Get all tickets
 *     description: Retrieves all tickets with optional filters
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [open, in_progress, resolved, closed]
 *         description: Filter by ticket status
 *       - in: query
 *         name: priority
 *         schema:
 *           type: string
 *           enum: [low, medium, high, urgent]
 *         description: Filter by ticket priority
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *         description: Filter by ticket category
 *     responses:
 *       200:
 *         description: List of tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   title:
 *                     type: string
 *                     example: Issue with product
 *                   status:
 *                     type: string
 *                     example: open
 *                   priority:
 *                     type: string
 *                     example: medium
 *                   category:
 *                     type: string
 *                     example: Technical Support
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     example: 2023-01-01T00:00:00.000Z
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
app.get('/api/tickets', authenticateToken, async (req, res) => {
    try {
        const { status, priority, category } = req.query;
        const filters = {};

        if (status) filters.status = status;
        if (priority) filters.priority = priority;
        if (category) filters.category = category;

        const tickets = await getTickets(filters);
        res.json(tickets);
    } catch (error) {
        console.error('Error fetching tickets:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/tickets/{id}:
 *   get:
 *     summary: Get a specific ticket
 *     description: Retrieves a ticket by its ID
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ticket ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Ticket details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 title:
 *                   type: string
 *                   example: Issue with product
 *                 description:
 *                   type: string
 *                   example: Detailed description
 *                 status:
 *                   type: string
 *                   example: open
 *                 priority:
 *                   type: string
 *                   example: medium
 *                 category:
 *                   type: string
 *                   example: Technical Support
 *                 customer:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: John Doe
 *                     email:
 *                       type: string
 *                       example: john.doe@example.com
 *                     phone:
 *                       type: string
 *                       example: +1234567890
 *                 created_at:
 *                   type: string
 *                   format: date-time
 *                   example: 2023-01-01T00:00:00.000Z
 *                 updated_at:
 *                   type: string
 *                   format: date-time
 *                   example: 2023-01-01T00:00:00.000Z
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Internal server error
 */
app.get('/api/tickets/:id', authenticateToken, async (req, res) => {
    try {
        const ticket = await getTicketById(req.params.id);
        if (!ticket) {
            return res.status(404).json({ error: 'Ticket not found' });
        }
        res.json(ticket);
    } catch (error) {
        console.error('Error fetching ticket:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/tickets/{id}/status:
 *   patch:
 *     summary: Update ticket status
 *     description: Updates the status of a specific ticket
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ticket ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - status
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [open, in_progress, resolved, closed]
 *                 example: in_progress
 *     responses:
 *       200:
 *         description: Ticket status updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ticket status updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Internal server error
 */
app.patch('/api/tickets/:id/status', authenticateToken, requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ error: 'Valid status is required' });
        }

        await updateTicketStatus(req.params.id, status);
        res.json({ message: 'Ticket status updated successfully' });
    } catch (error) {
        console.error('Error updating ticket status:', error);
        if (error.message === 'Ticket not found') {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

/**
 * @swagger
 * /api/tickets/{id}:
 *   put:
 *     summary: Update ticket details
 *     description: Updates the details of a specific ticket
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ticket ID
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               title:
 *                 type: string
 *                 example: Updated issue title
 *               description:
 *                 type: string
 *                 example: Updated description
 *               priority:
 *                 type: string
 *                 enum: [low, medium, high, urgent]
 *                 example: high
 *               category:
 *                 type: string
 *                 example: Billing
 *               assigned_to:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Ticket updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ticket updated successfully
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Internal server error
 */
app.put('/api/tickets/:id', authenticateToken, requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
    try {
        const { title, description, priority, category, assigned_to } = req.body;

        if (!title) {
            return res.status(400).json({ error: 'Title is required' });
        }

        await updateTicket(req.params.id, {
            title,
            description,
            priority,
            category,
            assigned_to
        });

        res.json({ message: 'Ticket updated successfully' });
    } catch (error) {
        console.error('Error updating ticket:', error);
        if (error.message === 'Ticket not found') {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

/**
 * @swagger
 * /api/tickets/{id}/history:
 *   get:
 *     summary: Get ticket history
 *     description: Retrieves the history of changes for a specific ticket
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ticket ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Ticket history
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   ticket_id:
 *                     type: integer
 *                     example: 1
 *                   field_changed:
 *                     type: string
 *                     example: status
 *                   old_value:
 *                     type: string
 *                     example: open
 *                   new_value:
 *                     type: string
 *                     example: in_progress
 *                   changed_by:
 *                     type: integer
 *                     example: 2
 *                   changed_at:
 *                     type: string
 *                     format: date-time
 *                     example: 2023-01-01T00:00:00.000Z
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
app.get('/api/tickets/:id/history', authenticateToken, async (req, res) => {
    try {
        const history = await getTicketHistory(req.params.id);
        res.json(history);
    } catch (error) {
        console.error('Error fetching ticket history:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/queue:
 *   get:
 *     summary: Get queue
 *     description: Retrieves the current queue of tickets
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of queued tickets
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   ticket_id:
 *                     type: integer
 *                     example: 1
 *                   position:
 *                     type: integer
 *                     example: 1
 *                   added_at:
 *                     type: string
 *                     format: date-time
 *                     example: 2023-01-01T00:00:00.000Z
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
app.get('/api/queue', authenticateToken, requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
    try {
        const queue = await getQueueTickets();
        res.json(queue);
    } catch (error) {
        console.error('Error fetching queue:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/queue/{ticketId}:
 *   delete:
 *     summary: Remove ticket from queue
 *     description: Removes a ticket from the queue (when resolved or closed)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: ticketId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ticket ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Ticket removed from queue
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ticket removed from queue
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Internal server error
 */
app.delete('/api/queue/:ticketId', authenticateToken, requireRole(['CustomerService', 'Supervisor']), async (req, res) => {
    try {
        await removeTicketFromQueue(req.params.ticketId);
        res.json({ message: 'Ticket removed from queue' });
    } catch (error) {
        console.error('Error removing ticket from queue:', error);
        if (error.message === 'Ticket not found') {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

/**
 * @swagger
 * /api/dashboard/stats:
 *   get:
 *     summary: Get dashboard stats
 *     description: Retrieves statistics for the dashboard
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalTickets:
 *                   type: integer
 *                   example: 100
 *                 openTickets:
 *                   type: integer
 *                   example: 20
 *                 inProgressTickets:
 *                   type: integer
 *                   example: 15
 *                 resolvedTickets:
 *                   type: integer
 *                   example: 50
 *                 closedTickets:
 *                   type: integer
 *                   example: 15
 *                 queueLength:
 *                   type: integer
 *                   example: 10
 *                 urgentTickets:
 *                   type: integer
 *                   example: 5
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
    try {
        const allTickets = await getTickets();
        const queue = await getQueueTickets();

        const stats = {
            totalTickets: allTickets.length,
            openTickets: allTickets.filter(t => t.status === 'open').length,
            inProgressTickets: allTickets.filter(t => t.status === 'in_progress').length,
            resolvedTickets: allTickets.filter(t => t.status === 'resolved').length,
            closedTickets: allTickets.filter(t => t.status === 'closed').length,
            queueLength: queue.length,
            urgentTickets: allTickets.filter(t => t.priority === 'urgent').length
        };

        res.json(stats);
    } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/tickets/{id}:
 *   delete:
 *     summary: Delete a ticket
 *     description: Deletes a specific ticket (Supervisor only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Ticket ID
 *         example: 1
 *     responses:
 *       200:
 *         description: Ticket deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ticket deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Ticket not found
 *       500:
 *         description: Internal server error
 */
app.delete('/api/tickets/:id', authenticateToken, requireRole(['Supervisor']), async (req, res) => {
    try {
        await deleteTicket(req.params.id);
        res.json({ message: 'Ticket deleted successfully' });
    } catch (error) {
        console.error('Error deleting ticket:', error);
        if (error.message === 'Ticket not found') {
            res.status(404).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
});

/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users
 *     description: Retrieves all users (Supervisor only)
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   username:
 *                     type: string
 *                     example: john_doe
 *                   role:
 *                     type: string
 *                     example: CustomerService
 *                   created_at:
 *                     type: string
 *                     format: date-time
 *                     example: 2023-01-01T00:00:00.000Z
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
app.get('/api/users', authenticateToken, requireRole(['Supervisor']), async (req, res) => {
    try {
        const users = await getUsers();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user
 *     description: Deletes a specific user (Supervisor only)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: User ID
 *         example: 1
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User deleted successfully
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       500:
 *         description: Internal server error
 */
app.delete('/api/users/:id', authenticateToken, requireRole(['Supervisor']), async (req, res) => {
    try {
        await deleteUser(req.params.id);
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Customer Service API server running on port ${PORT}`);
});

module.exports = app;
