# API Documentation

This document provides detailed information about the backend API endpoints.

## Base URL

All API endpoints are prefixed with `/api`.

## Authentication

Authentication is handled via JWT (JSON Web Tokens). A token is provided upon successful login and must be included in the `Authorization` header for all protected routes as a Bearer token.

---

## Auth API

Handles user registration and login.

### 1. Register User

- **POST** `/auth/register`
- **Description:** Registers a new user.
- **Request Body:**
  ```json
  {
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "role": "CustomerService"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "message": "User registered successfully",
    "userId": 1
  }
  ```

### 2. Login User

- **POST** `/auth/login`
- **Description:** Authenticates a user and returns a JWT.
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "token": "jwt-token",
    "user": {
      "id": 1,
      "username": "user",
      "role": "CustomerService"
    }
  }
  ```

---

## Users API

- **Protected:** Yes
- **Required Role:** `Supervisor`

### 1. Get All Users

- **GET** `/users`
- **Description:** Retrieves a list of all users.

### 2. Get User by ID

- **GET** `/users/:id`
- **Description:** Retrieves a single user by their ID.

### 3. Create User

- **POST** `/users`
- **Description:** Creates a new user.
- **Request Body:**
  ```json
  {
    "username": "newuser",
    "email": "newuser@example.com",
    "password": "password123",
    "role": "CustomerService"
  }
  ```

### 4. Update User

- **PATCH** `/users/:id`
- **Description:** Updates a user's information.
- **Request Body:**
  ```json
  {
    "username": "updateduser",
    "email": "updated@example.com",
    "role": "Supervisor"
  }
  ```

### 5. Delete User

- **DELETE** `/users/:id`
- **Description:** Deletes a user.

---

## Customers API

- **Protected:** Yes
- **Required Roles:** `CustomerService`, `Supervisor`

### 1. Get All Customers

- **GET** `/customers`
- **Description:** Retrieves a list of all customers.

### 2. Search Customers

- **GET** `/customers/search`
- **Description:** Searches for customers by name, phone, or email.
- **Query Parameters:** `name`, `phone`, `email`

### 3. Get Customer by ID

- **GET** `/customers/:id`
- **Description:** Retrieves a single customer by ID.

### 4. Create Customer

- **POST** `/customers`
- **Description:** Creates a new customer.
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john.doe@example.com",
    "phone": "123456789012"
  }
  ```

### 5. Update Customer

- **PATCH** `/customers/:id`
- **Description:** Updates a customer's information.
- **Request Body:**
  ```json
  {
    "name": "Jane Doe",
    "phone": "098765432109"
  }
  ```

### 6. Delete Customer

- **DELETE** `/customers/:id`
- **Description:** Deletes a customer.
- **Required Role:** `Supervisor`

---

## Tickets API

- **Protected:** Yes
- **Required Roles:** `CustomerService`, `Supervisor`

### 1. Get All Tickets

- **GET** `/tickets`
- **Description:** Retrieves a paginated list of tickets with filtering and sorting options.
- **Query Parameters:** `status`, `priority`, `q`, `sortBy`, `sortDir`, `page`, `pageSize`, `createdBy`

### 2. Get Ticket by ID

- **GET** `/tickets/:id`
- **Description:** Retrieves a single ticket by ID.

### 3. Create Ticket

- **POST** `/tickets`
- **Description:** Creates a new ticket.
- **Request Body:**
  ```json
  {
    "title": "New Ticket",
    "description": "Ticket description.",
    "priority": "medium",
    "customerId": 1
  }
  ```

### 4. Update Ticket Status

- **PATCH** `/tickets/:id/status`
- **Description:** Updates the status of a ticket.
- **Request Body:**
  ```json
  {
    "status": "in_progress"
  }
  ```

### 5. Delete Ticket

- **DELETE** `/tickets/:id`
- **Description:** Deletes a ticket.
- **Required Role:** `Supervisor`

---

## Password Resets API

- **Protected:** Yes

### 1. Request Password Reset

- **POST** `/password-resets/request`
- **Description:** Allows a user to request a password reset.
- **Required Role:** Any authenticated user.

### 2. Approve Password Reset

- **POST** `/password-resets/:id/approve`
- **Description:** Allows a supervisor to approve a password reset request.
- **Required Role:** `Supervisor`

### 3. Reset Password

- **POST** `/password-resets/reset`
- **Description:** Allows a user to reset their password using a valid token.
- **Request Body:**
  ```json
  {
    "token": "valid-reset-token",
    "newPassword": "new-secure-password"
  }
  ```

---

## Queue API

- **Protected:** Yes
- **Required Roles:** `CustomerService`, `Supervisor`

### 1. Get Queue by Service

- **GET** `/queue/:serviceId`
- **Description:** Retrieves the queue for a specific service.
- **Query Parameters:** `status`, `limit`

### 2. Get Queue Status

- **GET** `/queue/:serviceId/status`
- **Description:** Retrieves queue status counts for a service.

### 3. Get Queue Ticket by ID

- **GET** `/queue/ticket/:id`
- **Description:** Retrieves a specific queue ticket by ID.

### 4. Claim Ticket

- **POST** `/queue/ticket/:id/claim`
- **Description:** Claims a waiting ticket for service.
- **Request Body:**
  ```json
  {
    "claimedBy": 1
  }
  ```

### 5. Start Service

- **POST** `/queue/ticket/:id/start`
- **Description:** Starts service for a claimed ticket.

### 6. Resolve Ticket

- **POST** `/queue/ticket/:id/resolve`
- **Description:** Resolves a ticket as completed.
- **Request Body:**
  ```json
  {
    "notes": "Optional resolution notes"
  }
  ```

### 7. Requeue Ticket

- **POST** `/queue/ticket/:id/requeue`
- **Description:** Requeues a ticket back to waiting status.
- **Request Body:**
  ```json
  {
    "notes": "Optional requeue notes"
  }
  ```

### 8. Mark No Show

- **POST** `/queue/ticket/:id/no-show`
- **Description:** Marks a called ticket as no-show.

### 9. Cancel Ticket

- **POST** `/queue/ticket/:id/cancel`
- **Description:** Cancels a ticket.
- **Request Body:**
  ```json
  {
    "notes": "Optional cancellation notes"
  }
  ```

### 10. Create Support Ticket

- **POST** `/queue/ticket/:id/support`
- **Description:** Creates a support ticket linked to a queue ticket.
- **Request Body:**
  ```json
  {
    "summary": "Support ticket summary",
    "details": "Detailed description",
    "category": "Technical",
    "attachmentsJson": "{\"files\": []}"
  }
  ```

### 11. Get Support Tickets

- **GET** `/queue/ticket/:id/support`
- **Description:** Retrieves support tickets for a queue ticket.

---

## Kiosk API

- **Protected:** No (Public endpoints for customer intake)

### 1. Get Services

- **GET** `/kiosk/services`
- **Description:** Retrieves active services for kiosk display.

### 2. Create Queue Ticket

- **POST** `/kiosk/ticket`
- **Description:** Creates a new queue ticket for a customer.
- **Request Body:**
  ```json
  {
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "1234567890",
    "serviceId": 1,
    "notes": "Optional notes"
  }
  ```
- **Response (201 Created):**
  ```json
  {
    "ticket": {
      "id": 1,
      "number": "A001",
      "status": "WAITING",
      "created_at": "2024-01-01T10:00:00Z"
    },
    "customer": {
      "id": 1,
      "name": "John Doe",
      "phone": "1234567890"
    },
    "message": "Queue ticket created successfully"
  }
  ```

### 3. Get Ticket Status

- **GET** `/kiosk/ticket/:id`
- **Description:** Retrieves public ticket status for customer display.

---

## Services API

- **Protected:** Yes
- **Required Role:** `Supervisor`

### 1. Get All Services

- **GET** `/services`
- **Description:** Retrieves all services.
- **Query Parameters:** `activeOnly`

### 2. Create Service

- **POST** `/services`
- **Description:** Creates a new service.
- **Request Body:**
  ```json
  {
    "name": "General Inquiry",
    "codePrefix": "A",
    "isActive": true,
    "slaWarnMinutes": 10
  }
  ```

### 3. Get Service by ID

- **GET** `/services/:id`
- **Description:** Retrieves a specific service by ID.

### 4. Update Service

- **PATCH** `/services/:id`
- **Description:** Updates a service.
- **Request Body:**
  ```json
  {
    "name": "Updated Service Name",
    "isActive": false
  }
  ```

### 5. Delete Service

- **DELETE** `/services/:id`
- **Description:** Deletes a service.

---

## Counters API

- **Protected:** Yes
- **Required Role:** `Supervisor`

### 1. Get All Counters

- **GET** `/counters`
- **Description:** Retrieves all counters.
- **Query Parameters:** `activeOnly`

### 2. Create Counter

- **POST** `/counters`
- **Description:** Creates a new counter.
- **Request Body:**
  ```json
  {
    "name": "Counter 1",
    "allowedServiceIds": [1, 2, 3],
    "isActive": true
  }
  ```

### 3. Get Counter by ID

- **GET** `/counters/:id`
- **Description:** Retrieves a specific counter by ID.

### 4. Update Counter

- **PATCH** `/counters/:id`
- **Description:** Updates a counter.
- **Request Body:**
  ```json
  {
    "name": "Updated Counter Name",
    "allowedServiceIds": [1, 2]
  }
  ```

### 5. Delete Counter

- **DELETE** `/counters/:id`
- **Description:** Deletes a counter.

---

## Admin API

- **Protected:** Yes
- **Required Role:** `Supervisor`

### 1. Get Settings

- **GET** `/admin/settings`
- **Description:** Retrieves all application settings.

### 2. Get Setting

- **GET** `/admin/settings/:key`
- **Description:** Retrieves a specific setting by key.

### 3. Update Setting

- **PUT** `/admin/settings/:key`
- **Description:** Updates or creates a setting.
- **Request Body:**
  ```json
  {
    "value": "new setting value"
  }
  ```

### 4. Support Tickets Report

- **GET** `/admin/reports/support-tickets`
- **Description:** Retrieves support tickets report with filtering and pagination.
- **Query Parameters:** `status`, `category`, `q`, `sortBy`, `sortDir`, `limit`, `offset`

### 5. Queue Statistics Report

- **GET** `/admin/reports/queue-stats`
- **Description:** Retrieves queue statistics (placeholder for future implementation).
