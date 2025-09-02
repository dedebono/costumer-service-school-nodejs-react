const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

// Database file path
const DB_PATH = path.join(__dirname, 'customer_service.db');

// Create database connection
const db = new sqlite3.Database(DB_PATH);

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Initialize database with schema
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        try {
            const schemaPath = path.join(__dirname, 'schema.sql');
            const schema = fs.readFileSync(schemaPath, 'utf8');
            db.exec(schema, (err) => {
                if (err) {
                    console.error('Error initializing database:', err);
                    reject(err);
                } else {
                    console.log('Database initialized successfully');
                    resolve();
                }
            });
        } catch (error) {
            console.error('Error initializing database:', error);
            reject(error);
        }
    });
}

// Helper functions
function getCustomer(customerId) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM customers WHERE id = ?', [customerId], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function createCustomer(customerData) {
    return new Promise((resolve, reject) => {
        const { name, email, phone } = customerData;

        // Check if customer already exists
        db.get('SELECT * FROM customers WHERE email = ?', [email], (err, row) => {
            if (err) return reject(err);
            if (row) return resolve(row);

            // Insert new customer
            db.run('INSERT INTO customers (name, email, phone) VALUES (?, ?, ?)', [name, email, phone], function(err) {
                if (err) reject(err);
                else resolve({ id: this.lastID, name, email, phone });
            });
        });
    });
}

function createTicket(ticketData) {
    return new Promise((resolve, reject) => {
        const { customerId, title, description, priority = 'medium', category } = ticketData;
        const ticketId = require('uuid').v4();

        db.serialize(() => {
            db.run('INSERT INTO tickets (id, customer_id, title, description, priority, category) VALUES (?, ?, ?, ?, ?, ?)',
                [ticketId, customerId, title, description, priority, category], function(err) {
                if (err) return reject(err);

                // Get next queue position
                db.get('SELECT COALESCE(MAX(position), 0) + 1 as next_position FROM queue', [], (err, row) => {
                    if (err) return reject(err);

                    const nextPosition = row.next_position;
                    db.run('INSERT INTO queue (ticket_id, position) VALUES (?, ?)', [ticketId, nextPosition], (err) => {
                        if (err) return reject(err);

                        // Log history
                        db.run('INSERT INTO ticket_history (ticket_id, action, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?)',
                            [ticketId, 'created', null, 'open', 'system'], (err) => {
                            if (err) reject(err);
                            else resolve(ticketId);
                        });
                    });
                });
            });
        });
    });
}

function updateTicketStatus(ticketId, newStatus, changedBy = 'system') {
    return new Promise((resolve, reject) => {
        // Get current ticket
        db.get('SELECT * FROM tickets WHERE id = ?', [ticketId], (err, ticket) => {
            if (err) return reject(err);
            if (!ticket) return reject(new Error('Ticket not found'));

            const oldStatus = ticket.status;
            db.run('UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
                [newStatus, ticketId], (err) => {
                if (err) return reject(err);

                // Log history
                db.run('INSERT INTO ticket_history (ticket_id, action, old_value, new_value, changed_by) VALUES (?, ?, ?, ?, ?)',
                    [ticketId, 'status_changed', oldStatus, newStatus, changedBy], (err) => {
                    if (err) return reject(err);

                    // If resolved or closed, update resolved_at
                    if (newStatus === 'resolved' || newStatus === 'closed') {
                        db.run('UPDATE tickets SET resolved_at = CURRENT_TIMESTAMP WHERE id = ?', [ticketId], (err) => {
                            if (err) reject(err);
                            else resolve(true);
                        });
                    } else {
                        resolve(true);
                    }
                });
            });
        });
    });
}

function getTickets(filters = {}) {
    return new Promise((resolve, reject) => {
        let query = `
            SELECT t.*, c.name as customer_name, c.email as customer_email
            FROM tickets t
            LEFT JOIN customers c ON t.customer_id = c.id
        `;

        const conditions = [];
        const params = [];

        if (filters.status) {
            conditions.push('t.status = ?');
            params.push(filters.status);
        }

        if (filters.priority) {
            conditions.push('t.priority = ?');
            params.push(filters.priority);
        }

        if (filters.category) {
            conditions.push('t.category = ?');
            params.push(filters.category);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        query += ' ORDER BY t.created_at DESC';

        db.all(query, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function getTicketById(id) {
    return new Promise((resolve, reject) => {
        db.get(`
            SELECT t.*, c.name as customer_name, c.email as customer_email
            FROM tickets t
            LEFT JOIN customers c ON t.customer_id = c.id
            WHERE t.id = ?
        `, [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function updateTicket(id, data) {
    return new Promise((resolve, reject) => {
        db.run(`
            UPDATE tickets
            SET title = ?, description = ?, priority = ?, category = ?, assigned_to = ?, updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
        `, [data.title, data.description, data.priority, data.category, data.assigned_to, id], (err) => {
            if (err) reject(err);
            else resolve(true);
        });
    });
}

function getQueueTickets() {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT q.*, t.title, t.priority, c.name as customer_name
            FROM queue q
            JOIN tickets t ON q.ticket_id = t.id
            LEFT JOIN customers c ON t.customer_id = c.id
            ORDER BY q.position ASC
        `, [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function removeTicketFromQueue(ticketId) {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM queue WHERE ticket_id = ?', [ticketId], (err) => {
            if (err) reject(err);
            else resolve(true);
        });
    });
}

function getTicketHistory(ticketId) {
    return new Promise((resolve, reject) => {
        db.all(`
            SELECT * FROM ticket_history
            WHERE ticket_id = ?
            ORDER BY changed_at DESC
        `, [ticketId], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

// User-related functions
function createUser(userData) {
    return new Promise((resolve, reject) => {
        const { username, email, password, role = 'CustomerService' } = userData;

        // Hash the password
        bcrypt.hash(password, 10, (err, passwordHash) => {
            if (err) return reject(err);

            // Check if user already exists
            db.get('SELECT * FROM users WHERE email = ? OR username = ?', [email, username], (err, row) => {
                if (err) return reject(err);
                if (row) return reject(new Error('User already exists'));

                // Insert new user
                db.run('INSERT INTO users (username, email, password_hash, role) VALUES (?, ?, ?, ?)',
                    [username, email, passwordHash, role], function(err) {
                    if (err) reject(err);
                    else resolve({ id: this.lastID, username, email, role });
                });
            });
        });
    });
}

function authenticateUser(email, password) {
    return new Promise((resolve, reject) => {
        db.get('SELECT * FROM users WHERE email = ? AND is_active = 1', [email], (err, user) => {
            if (err) return reject(err);
            if (!user) return reject(new Error('User not found'));

            // Compare password
            bcrypt.compare(password, user.password_hash, (err, isMatch) => {
                if (err) return reject(err);
                if (!isMatch) return reject(new Error('Invalid password'));

                // Return user without password hash
                const { password_hash, ...userWithoutPassword } = user;
                resolve(userWithoutPassword);
            });
        });
    });
}

function getUserById(id) {
    return new Promise((resolve, reject) => {
        db.get('SELECT id, username, email, role, is_active, created_at, updated_at FROM users WHERE id = ?', [id], (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function getAllUsers() {
    return new Promise((resolve, reject) => {
        db.all('SELECT id, username, email, role, is_active, created_at, updated_at FROM users ORDER BY created_at DESC', [], (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

function updateUser(id, data) {
    return new Promise((resolve, reject) => {
        const updates = [];
        const params = [];

        if (data.username) {
            updates.push('username = ?');
            params.push(data.username);
        }
        if (data.email) {
            updates.push('email = ?');
            params.push(data.email);
        }
        if (data.role) {
            updates.push('role = ?');
            params.push(data.role);
        }
        if (data.is_active !== undefined) {
            updates.push('is_active = ?');
            params.push(data.is_active);
        }

        if (updates.length === 0) return reject(new Error('No fields to update'));

        updates.push('updated_at = CURRENT_TIMESTAMP');
        params.push(id);

        db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params, (err) => {
            if (err) reject(err);
            else resolve(true);
        });
    });
}

function deleteUser(id) {
    return new Promise((resolve, reject) => {
        db.run('DELETE FROM users WHERE id = ?', [id], (err) => {
            if (err) reject(err);
            else resolve(true);
        });
    });
}

// Initialize database on module load
initializeDatabase().catch(console.error);

module.exports = {
    db,
    getCustomer,
    createCustomer,
    createTicket,
    updateTicketStatus,
    getTickets,
    getTicketById,
    updateTicket,
    getQueueTickets,
    removeTicketFromQueue,
    getTicketHistory,
    createUser,
    authenticateUser,
    getUserById,
    getAllUsers,
    updateUser,
    deleteUser
};
