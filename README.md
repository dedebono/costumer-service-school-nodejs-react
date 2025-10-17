# Customer Service School - Node.js React

A full-stack customer service application for schools, built with Node.js, Express, React, and MySQL. This application provides a platform for managing customer service tickets, with different roles for customer service staff and supervisors.

## Technologies Used

### Backend
*   **Node.js**: JavaScript runtime environment.
*   **Express.js**: Web framework for Node.js.
*   **MySQL**: SQL database engine.
*   **multer**: Middleware for handling `multipart/form-data`, used for file uploads.
*   **csv-parser**: For parsing CSV files, used for bulk data import.
*   **jsonwebtoken (JWT)**: For generating and verifying access tokens for authentication.
*   **bcrypt**: For hashing passwords.
*   **Swagger UI Express**: For API documentation.

### Frontend
*   **React**: JavaScript library for building user interfaces.
*   **Vite**: Next-generation frontend tooling for fast development.
*   **React Router**: For declarative routing in the React application.
*   **Axios**: For making HTTP requests to the backend API.
*   **date-fns**: For modern JavaScript date utility library.
*   **lucide-react**: For beautiful and consistent icons.

### Development & Deployment
*   **Docker & Docker Compose**: For containerizing and running the application services.
*   **Nodemon**: For automatically restarting the backend server during development.

## File Structure

The project is organized as a monorepo with two main directories: `backend` and `frontend`.

```
costumer-service-school-nodejs-react/
├── backend/
│   ├── src/
│   │   ├── models/       # Database models and db connection
│   │   ├── routes/       # API route definitions
│   │   └── middleware/   # Express middleware (e.g., auth)
│   ├── scripts/        # Scripts for database seeding/migration
│   ├── Dockerfile      # Docker instructions for the backend
│   ├── server.js       # Main entry point for the backend server
│   └── package.json    # Backend dependencies and scripts
│
├── frontend/
│   ├── src/
│   │   ├── components/   # Reusable React components
│   │   ├── context/      # React context for global state (e.g., AuthContext)
│   │   ├── features/     # Components related to specific features (auth, tickets)
│   │   ├── pages/        # Top-level page components
│   │   ├── lib/          # Utility functions and API helpers
│   │   ├── App.jsx       # Main application component with routing
│   │   └── main.jsx      # Entry point for the React application
│   ├── Dockerfile      # Docker instructions for the frontend
│   └── package.json    # Frontend dependencies and scripts
│
├── docker-compose.yml  # Docker Compose configuration to run both services
└── README.md           # You are here!
```

## Queue Feature

This application now includes a full queue management feature for customer service:

- Services: Define service types with code prefixes and SLAs.
- Counters: Define counters with allowed services.
- Queue Tickets: Manage queue tickets with statuses (WAITING, CALLED, IN_SERVICE, DONE, NO_SHOW, CANCELED).
- Support Tickets: Linked support tickets for queue tickets.
- Settings: Configurable settings for SLAs and business hours.
- Role-based access control for CustomerService and Supervisor roles.

## Admission Feature

This application includes a student admission pipeline feature:

- **Pipelines**: Define admission pipelines with multiple steps.
- **Applicants**: Manage applicants and their progress through the pipeline.
- **Dynamic Steps**: Create, update, and delete steps within a pipeline.
- **Drag & Drop**: Easily move applicants between steps.

## Real-time Updates

The application uses **Socket.IO** for real-time communication between the frontend and backend. This is used for:

- **Queue Updates**: Notifying clients when the queue changes.
- **Notifications**: Sending real-time notifications to users.

## Frontend Flow

The frontend application provides a user interface for interacting with the customer service system.

1.  **Authentication**:
    *   Users are prompted to log in.
    *   Upon successful login, a JWT token is stored, and the user's information (including their role) is saved in the `AuthContext`.
    *   This context is used to protect routes and display UI elements appropriate for the user's role.

2.  **User Roles & Features**:
    *   **Customer Service (`cs`)**:
        *   Can view the ticket queue.
        *   Can create new tickets for customers.
        *   Can view and update ticket details.
        *   Can search for existing tickets.
    *   **Supervisor (`supervisor`)**:
        *   Has all the permissions of a Customer Service user.
        *   Can create new user accounts (both `cs` and `supervisor`).

## Setup and Running the Application

You can run this project in two ways: using Docker (recommended for ease of use) or setting it up manually on your local machine.

### 1. Using Docker (Recommended)

This method uses Docker Compose to build and run the frontend and backend services in isolated containers.

**Prerequisites**:
*   [Docker](https://docs.docker.com/get-docker/)
*   [Docker Compose](https://docs.docker.com/compose/install/)

**Instructions**:
1.  Clone the repository:
    ```sh
    git clone https://github.com/your_username_/costumer-service-school-nodejs-react.git
    cd costumer-service-school-nodejs-react
    ```
2.  Run the application using Docker Compose:
    ```sh
    docker-compose up --build
    ```
    The `--build` flag ensures the Docker images are rebuilt if you've made changes to the code.

3.  Access the application:
    *   **Frontend**: `http://localhost:5173`
    *   **Backend API**: `http://localhost:3000`

### 2. Local Manual Setup

This method involves running the frontend and backend servers directly on your machine.

**Prerequisites**:
*   [Node.js](https://nodejs.org/) (v16 or later recommended)
*   [npm](https://www.npmjs.com/) (usually comes with Node.js)
*   [MySQL](https://www.mysql.com/downloads/)

**Instructions**:

1.  **Clone the repository** (if you haven't already):
    ```sh
    git clone https://github.com/your_username_/costumer-service-school-nodejs-react.git
    cd costumer-service-school-nodejs-react
    ```

2.  **Setup the Backend**:
    *   Navigate to the backend directory and install dependencies:
        ```sh
        cd backend
        npm install
        ```
    *   Create a `.env` file in the `backend` directory. See the `Environment Variables` section below for the required content.
    *   Start the backend development server:
        ```sh
        npm run dev
        ```
    The backend will be running at `http://localhost:3000`.

3.  **Setup the Frontend**:
    *   Open a **new terminal** and navigate to the frontend directory:
        ```sh
        cd frontend
        npm install
        ```
    *   Create a `.env` file in the `frontend` directory. See the `Environment Variables` section below for the required content.
    *   Start the frontend development server:
        ```sh
        npm run dev
        ```
    The frontend will be running at `http://localhost:5173`.

## Environment Variables

The application uses environment variables for configuration.

### For Docker Setup

The variables are already defined in the `docker-compose.yml` file. You can modify them there if needed.

*   `JWT_SECRET`: Secret key for signing JWT tokens.
*   `SUPERVISOR_USERNAME`: Username for the default supervisor account.
*   `SUPERVISOR_PASSWORD`: Password for the default supervisor account.
*   `SUPERVISOR_EMAIL`: Email for the default supervisor account.
*   `VITE_API_BASE`: Base URL for the backend API (used by the frontend).

### For Manual Setup

For a manual setup, you need to create `.env` files in the respective directories.

1.  **Backend (`backend/.env`)**:
    Create this file and add the following content. Replace the placeholder values with your own secrets.
    ```env
    JWT_SECRET=your_super_secret_jwt_key
    SUPERVISOR_USERNAME=admin
    SUPERVISOR_PASSWORD=adminpassword
    SUPERVISOR_EMAIL=admin@example.com

    # MySQL Database Configuration
    DB_HOST=127.0.0.1
    DB_USER=root
    DB_PASSWORD=
    DB_NAME=customer_service
    ```

2.  **Frontend (`frontend/.env`)**:
    Create this file and add the following content. This tells the frontend where to find the backend API.
    ```env
    VITE_API_BASE=http://localhost:3000
    ```

## API Documentation

See the `backend/API_DOCUMENTATION.md` file for detailed API endpoint descriptions and usage.

## Testing

- Unit tests for backend models and routes are planned.
- Manual testing should cover the customer kiosk flow, queue management by customer service, and admin setup.
- Real-time updates via websockets are planned for future releases.

## Contribution

Contributions are welcome! Please fork the repository and submit pull requests.

## License

MIT License
