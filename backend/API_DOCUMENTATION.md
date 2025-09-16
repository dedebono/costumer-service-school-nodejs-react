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
