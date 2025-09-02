import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../api'
import './TicketList.css'

const TicketList = () => {
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    fetchTickets()
  }, [])

  const fetchTickets = async () => {
    try {
      setLoading(true)
      const ticketData = await api.getTickets()
      setTickets(ticketData)
      setError(null)
    } catch (err) {
      setError('Failed to fetch tickets')
      console.error('Error fetching tickets:', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredTickets = tickets.filter(ticket => {
    if (filter === 'all') return true
    return ticket.status === filter
  })

  const getStatusClass = (status) => {
    switch (status) {
      case 'open': return 'status-open'
      case 'pending': return 'status-pending'
      case 'resolved': return 'status-resolved'
      default: return 'status-default'
    }
  }

  if (loading) {
    return <div className="ticket-list-loading">Loading tickets...</div>
  }

  if (error) {
    return <div className="ticket-list-error">{error}</div>
  }

  return (
    <div className="ticket-list">
      <h1>Support Tickets</h1>
      <div className="ticket-list-controls">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Tickets</option>
          <option value="open">Open</option>
          <option value="pending">Pending</option>
          <option value="resolved">Resolved</option>
        </select>
        <Link to="/tickets/new" className="new-ticket-btn">
          New Ticket
        </Link>
      </div>
      <div className="ticket-list-container">
        {filteredTickets.length === 0 ? (
          <p className="no-tickets">No tickets found.</p>
        ) : (
          filteredTickets.map(ticket => (
            <div key={ticket.id} className="ticket-item">
              <div className="ticket-header">
                <h3>{ticket.title}</h3>
                <span className={`ticket-status ${getStatusClass(ticket.status)}`}>
                  {ticket.status}
                </span>
              </div>
              <p className="ticket-description">{ticket.description}</p>
              <div className="ticket-meta">
                <span>Customer: {ticket.customerName}</span>
                <span>Priority: {ticket.priority}</span>
                <span>Created: {new Date(ticket.createdAt).toLocaleDateString()}</span>
              </div>
              <Link to={`/tickets/${ticket.id}`} className="view-ticket-btn">
                View Details
              </Link>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default TicketList
