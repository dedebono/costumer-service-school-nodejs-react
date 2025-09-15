# Customer Service Ticketing API

A Node.js/Express backend API for managing customer service tickets, customers, users, and authentication. Built with SQLite database and JWT authentication.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm

### Installation
1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```

### Running the Server
- Development mode (with auto-restart):
  ```bash
  npm run dev
  ```
- Production mode:
  ```bash
  npm start
  ```

The server will run on `http://localhost:3000`

### Database Setup
The API uses SQLite database (`database.sqlite`). The schema is defined in `schema.sql`. Run the seed script to create a supervisor user:
```bash
npm run seed:supervisor
```

## Base URL
```
http://localhost:3000/api
```

## Authentication
Most endpoints require JWT authentication. Obtain a token by logging in via `/auth/login`. Include the token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## API Endpoints

### Authentication (Public)
No authentication required for these endpoints.

#### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "string",
  "email": "string",
  "password": "string",
  "role": "CustomerService" | "Supervisor" (optional, defaults to CustomerService)
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "userId": "number"
}
```

#### POST /auth/login
Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "string",
  "password": "string"
}
```

**Response (200):**
```json
{
  "token": "jwt-token-string",
  "user": {
    "id": "number",
    "username": "string",
    "role": "string"
  }
}
```

### Customers
Requires authentication. Roles: CustomerService, Supervisor.

#### GET /customers
Get all customers.

**Response (200):**
```json
[
  {
    "id": "string",
    "name": "string",
    "email": "string",
    "phone": "string"
  }
]
```

#### GET /customers/search
Search customers by name, phone, or email.

**Query Parameters:**
- `name` (string): Partial name match
- `phone` (string): Exact 12-digit phone match
- `email` (string): Partial email match
- `limit` (number, optional): Max results (default: 20, max: 100)
- `offset` (number, optional): Pagination offset (default: 0)

**Response (200):**
```json
[
  {
    "id": "string",
    "name": "string",
    "email": "string",
    "phone": "string"
  }
]
```

#### POST /customers
Create a new customer.

**Request Body:**
```json
{
  "name": "string (required)",
  "email": "string (required)",
  "phone": "string (optional)"
}
```

**Response (201):**
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "phone": "string"
}
```

#### GET /customers/:id
Get customer by ID.

**Response (200):**
```json
{
  "id": "string",
  "name": "string",
  "email": "string",
  "phone": "string"
}
```

#### PATCH /customers/:id
Update customer information.

**Request Body:**
```json
{
  "name": "string (optional)",
  "email": "string (optional)",
  "phone": "string (optional)"
}
```

**Response (200):**
```json
{
  "message": "Customer updated"
}
```

#### DELETE /customers/:id
Delete customer. Requires Supervisor role.

**Response (200):**
```json
{
  "message": "Customer deleted"
}
```

### Tickets
Requires authentication. Roles: CustomerService, Supervisor.

#### GET /tickets
Get all tickets with filtering and pagination.

**Query Parameters:**
- `status` (string): Filter by status
- `priority` (string): Filter by priority
- `q` (string): Search in title/description
- `sortBy` (string): Sort field
- `sortDir` (string): Sort direction (asc/desc)
- `page` (number): Page number (default: 1)
- `pageSize` (number): Items per page (default: 20, max: 100)
- `createdBy` (number): Filter by creator user ID

**Response (200):**
```json
{
  "data": [
    {
      "id": "string",
      "title": "string",
      "description": "string",
      "status": "string",
      "priority": "string",
      "createdBy": "number",
      "customerId": "string",
      "createdAt": "string",
      "updatedAt": "string"
    }
  ],
  "pagination": {
    "total": "number",
    "page": "number",
    "pageSize": "number",
    "pages": "number"
  }
}
```

#### POST /tickets
Create a new ticket.

**Request Body:**
```json
{
  "title": "string",
  "description": "string",
  "priority": "string",
  "customerId": "string (optional)"
}
```

**Response (201):**
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "status": "string",
  "priority": "string",
  "createdBy": "number",
  "customerId": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### GET /tickets/:id
Get ticket by ID.

**Response (200):**
```json
{
  "id": "string",
  "title": "string",
  "description": "string",
  "status": "string",
  "priority": "string",
  "createdBy": "number",
  "customerId": "string",
  "createdAt": "string",
  "updatedAt": "string"
}
```

#### PATCH /tickets/:id/status
Update ticket status.

**Request Body:**
```json
{
  "status": "string"
}
```

**Response (200):**
```json
{
  "message": "Status updated"
}
```

#### DELETE /tickets/:id
Delete ticket. Requires Supervisor role.

**Response (200):**
```json
{
  "message": "Ticket deleted"
}
```

### Users
Requires authentication. Supervisor role required for most operations.

#### GET /users
Get all users. Requires Supervisor role.

**Response (200):**
```json
[
  {
    "id": "number",
    "username": "string",
    "email": "string",
    "role": "string",
    "createdAt": "string"
  }
]
```

#### POST /users
Create a new user.

**Request Body:**
```json
{
  "username": "string (required)",
  "email": "string (required)",
  "password": "string (required)",
  "role": "CustomerService" | "Supervisor" (optional, defaults to CustomerService)
}
```

**Response (201):**
```json
{
  "message": "User created",
  "user": {
    "id": "number",
    "username": "string",
    "email": "string",
    "role": "string"
  }
}
```

#### GET /users/:id
Get user by ID. Requires Supervisor role.

**Response (200):**
```json
{
  "id": "number",
  "username": "string",
  "email": "string",
  "role": "string",
  "createdAt": "string"
}
```

#### PATCH /users/:id
Update user. Requires Supervisor role.

**Request Body:**
```json
{
  "username": "string (optional)",
  "email": "string (optional)",
  "password": "string (optional)",
  "role": "string (optional)"
}
```

**Response (200):**
```json
{
  "message": "User updated"
}
```

#### DELETE /users/:id
Delete user. Requires Supervisor role.

**Response (200):**
```json
{
  "message": "User deleted"
}
```

### Password Resets
Requires authentication.

#### POST /password-resets/request
Request a password reset (user requests for themselves).

**Response (201):**
```json
{
  "message": "Password reset requested. A supervisor must approve it.",
  "requestId": "string"
}
```

#### POST /password-resets/:id/approve
Approve a password reset request. Requires Supervisor role.

**Response (200):**
```json
{
  "message": "Request approved. User can now reset their password with this token.",
  "resetToken": "string"
}
```

#### POST /password-resets/reset
Finalize password reset using the approved token.

**Request Body:**
```json
{
  "token": "string (required)",
  "newPassword": "string (required)"
}
```

**Response (200):**
```json
{
  "message": "Password has been reset successfully."
}
```

## Swagger UI
Interactive API documentation is available at:
```
http://localhost:3000/api-docs
```

## Health Check
```
GET /health
```
Returns `{"status": "ok"}`

## Error Responses
All endpoints may return error responses in the following format:
```json
{
  "error": "Error message string"
}
```

Common HTTP status codes:
- 200: Success
- 201: Created
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 409: Conflict (e.g., duplicate email)
- 500: Internal Server Error
