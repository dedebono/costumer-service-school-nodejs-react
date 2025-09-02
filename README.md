# Customer Service App

A full-stack customer service queue and ticketing system built with React (frontend) and Node.js/Express (backend).

## Features

- Customer ticket submission and management
- Queue system for handling customer requests
- User authentication and authorization
- Real-time updates
- Responsive design

## Tech Stack

### Frontend
- React 18
- Vite
- React Router DOM
- Axios for API calls
- Lucide React for icons
- Date-fns for date handling

### Backend
- Node.js
- Express.js
- SQLite database
- JWT for authentication
- bcryptjs for password hashing
- Swagger for API documentation

## Project Status

This project is under active development. See `backend/TODO.md` for current development tasks and progress.

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd customer-service-app
   ```

2. Install backend dependencies:
   ```bash
   cd backend
   npm install
   ```

3. Install frontend dependencies:
   ```bash
   cd ../frontend
   npm install
   ```

4. Set up environment variables:
   Create a `.env` file in the backend directory with:
   ```
   PORT=3001
   JWT_SECRET=your-secret-key
   DATABASE_URL=./customer_service.db
   ```

5. Initialize the database:
   ```bash
   cd backend
   npm run init-db  # if available, or run schema.sql manually
   ```

### Running the Application

1. Start the backend server:
   ```bash
   cd backend
   npm run dev
   ```

2. Start the frontend development server:
   ```bash
   cd frontend
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`

## API Documentation

Once the backend is running, visit `http://localhost:3001/api-docs` for Swagger API documentation.

## Project Structure

```
customer-service-app/
├── backend/
│   ├── server.js
│   ├── auth.js
│   ├── db.js
│   ├── schema.sql
│   ├── package.json
│   └── customer_service.db
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   ├── Footer.jsx
│   │   │   ├── Queue.jsx
│   │   │   ├── TicketForm.jsx
│   │   │   ├── TicketList.jsx
│   │   │   └── TicketDetail.jsx
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── api.js
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
├── README.md
└── .gitignore
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.
