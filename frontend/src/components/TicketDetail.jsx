import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../api'
import './TicketDetail.css'

const TicketDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [ticket, setTicket] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [newComment, setNewComment] = useState('')
  const [updatingStatus, setUpdatingStatus] = useState(false)

  useEffect(() => {
    fetchTicket()
  }, [id])

  const fetchTicket = async () => {
    try {
      setLoading(true)
      const ticketData = await api.getTicket(id)
      setTicket(ticketData)
      setError(null)
    } catch (err) {
      setError('Failed to fetch ticket details')
      console.error('Error fetching ticket:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusUpdate = async (newStatus) => {
    try {
      setUpdatingStatus(true)
      await api.updateTicketStatus(id, newStatus)
      setTicket(prev => ({ ...prev, status: newStatus }))
    } catch (err) {
      setError('Failed to update ticket status')
      console.error('Error updating status:', err)
    } finally {
      setUpdatingStatus(false)
    }
  }

  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      await api.addComment(id, newComment)
      setNewComment('')
      fetchTicket() // Refresh to show new comment
    } catch (err) {
      setError('Failed to add comment')
      console.error('Error adding comment:', err)
    }
  }

  const getStatusClass = (status) => {
    switch (status) {
      case 'open': return 'status-open'
      case 'pending': return 'status-pending'
      case 'resolved': return 'status-resolved'
      default: return 'status-default'
    }
  }

  if (loading) {
    return <div className="ticket-detail-loading">Loading ticket details...</div>
  }

  if (error) {
    return <div className="ticket-detail-error">{error}</div>
  }

  if (!ticket) {
    return <div className="ticket-detail-error">Ticket not found</div>
  }

  return (
    <div className="ticket-detail">
      <div className="ticket-detail-header">
        <button onClick={() => navigate('/tickets')} className="back-btn">
          ← Back to Tickets
        </button>
        <h1>{ticket.title}</h1>
        <span className={`ticket-status ${getStatusClass(ticket.status)}`}>
          {ticket.status}
        </span>
      </div>

      <div className="ticket-detail-content">
        <div className="ticket-info">
          <div className="info-section">
            <h3>Description</h3>
            <p>{ticket.description}</p>
          </div>

          <div className="info-section">
            <h3>Customer Information</h3>
            <p><strong>Name:</strong> {ticket.customerName}</p>
            <p><strong>Email:</strong> {ticket.customerEmail}</p>
          </div>

          <div className="info-section">
            <h3>Ticket Details</h3>
            <p><strong>Priority:</strong> {ticket.priority}</p>
            <p><strong>Created:</strong> {new Date(ticket.createdAt).toLocaleString()}</p>
            {ticket.updatedAt && (
              <p><strong>Last Updated:</strong> {new Date(ticket.updatedAt).toLocaleString()}</p>
            )}
          </div>

          <div className="status-update-section">
            <h3>Update Status</h3>
            <div className="status-buttons">
              <button
                onClick={() => handleStatusUpdate('open')}
                disabled={updatingStatus || ticket.status === 'open'}
                className="status-btn status-open"
              >
                Open
              </button>
              <button
                onClick={() => handleStatusUpdate('pending')}
                disabled={updatingStatus || ticket.status === 'pending'}
                className="status-btn status-pending"
              >
                Pending
              </button>
              <button
                onClick={() => handleStatusUpdate('resolved')}
                disabled={updatingStatus || ticket.status === 'resolved'}
                className="status-btn status-resolved"
              >
                Resolved
              </button>
            </div>
          </div>
        </div>

        <div className="comments-section">
          <h3>Comments</h3>
          <div className="comments-list">
            {ticket.comments && ticket.comments.length > 0 ? (
              ticket.comments.map(comment => (
                <div key={comment.id} className="comment">
                  <div className="comment-header">
                    <span className="comment-author">{comment.author}</span>
                    <span className="comment-date">
                      {new Date(comment.createdAt).toLocaleString()}
                    </span>
                  </div>
                  <p className="comment-content">{comment.content}</p>
                </div>
              ))
            ) : (
              <p className="no-comments">No comments yet.</p>
            )}
          </div>

          <form onSubmit={handleAddComment} className="add-comment-form">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              rows="3"
              required
            />
            <button type="submit" className="add-comment-btn">
              Add Comment
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

export default TicketDetail
