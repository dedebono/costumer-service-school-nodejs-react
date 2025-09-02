import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import './TicketForm.css'

const TicketForm = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    customerName: '',
    customerEmail: '',
    priority: 'medium'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!formData.title.trim() || !formData.description.trim() || !formData.customerName.trim() || !formData.customerEmail.trim()) {
      setError('Please fill in all required fields')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await api.createTicket(formData)
      navigate('/tickets')
    } catch (err) {
      setError('Failed to create ticket. Please try again.')
      console.error('Error creating ticket:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="ticket-form">
      <h1>Create New Support Ticket</h1>
      <form onSubmit={handleSubmit} className="ticket-form-container">
        {error && <div className="form-error">{error}</div>}

        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Brief description of the issue"
          />
        </div>

        <div className="form-group">
          <label htmlFor="description">Description *</label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleChange}
            required
            placeholder="Detailed description of your issue"
            rows="5"
          />
        </div>

        <div className="form-group">
          <label htmlFor="customerName">Your Name *</label>
          <input
            type="text"
            id="customerName"
            name="customerName"
            value={formData.customerName}
            onChange={handleChange}
            required
            placeholder="Your full name"
          />
        </div>

        <div className="form-group">
          <label htmlFor="customerEmail">Email Address *</label>
          <input
            type="email"
            id="customerEmail"
            name="customerEmail"
            value={formData.customerEmail}
            onChange={handleChange}
            required
            placeholder="your.email@example.com"
          />
        </div>

        <div className="form-group">
          <label htmlFor="priority">Priority</label>
          <select
            id="priority"
            name="priority"
            value={formData.priority}
            onChange={handleChange}
          >
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="urgent">Urgent</option>
          </select>
        </div>

        <div className="form-actions">
          <button type="button" onClick={() => navigate('/tickets')} className="cancel-btn">
            Cancel
          </button>
          <button type="submit" disabled={loading} className="submit-btn">
            {loading ? 'Creating...' : 'Create Ticket'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default TicketForm
