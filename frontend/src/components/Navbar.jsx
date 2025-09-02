import React from 'react'
import { Link } from 'react-router-dom'
import './Navbar.css'

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">
        <Link to="/" className="navbar-logo">
          Customer Service
        </Link>
        <ul className="navbar-menu">
          <li className="navbar-item">
            <Link to="/" className="navbar-link">
              Queue
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/tickets" className="navbar-link">
              Tickets
            </Link>
          </li>
          <li className="navbar-item">
            <Link to="/tickets/new" className="navbar-link">
              New Ticket
            </Link>
          </li>
        </ul>
      </div>
    </nav>
  )
}

export default Navbar
