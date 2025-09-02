import React, { useState, useEffect } from 'react'
import { api } from '../api'
import './Queue.css'

const Queue = () => {
  const [queueStatus, setQueueStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchQueueStatus()
  }, [])

  const fetchQueueStatus = async () => {
    try {
      setLoading(true)
      const status = await api.getQueueStatus()
      setQueueStatus(status)
      setError(null)
    } catch (err) {
      setError('Failed to fetch queue status')
      console.error('Error fetching queue status:', err)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="queue-loading">Loading queue status...</div>
  }

  if (error) {
    return <div className="queue-error">{error}</div>
  }

  return (
    <div className="queue">
      <h1>Customer Service Queue</h1>
      <div className="queue-status">
        <div className="status-item">
          <h2>Total Tickets</h2>
          <p className="status-number">{queueStatus?.totalTickets || 0}</p>
        </div>
        <div className="status-item">
          <h2>Open Tickets</h2>
          <p className="status-number">{queueStatus?.openTickets || 0}</p>
        </div>
        <div className="status-item">
          <h2>Pending Tickets</h2>
          <p className="status-number">{queueStatus?.pendingTickets || 0}</p>
        </div>
        <div className="status-item">
          <h2>Resolved Tickets</h2>
          <p className="status-number">{queueStatus?.resolvedTickets || 0}</p>
        </div>
      </div>
      <button className="refresh-btn" onClick={fetchQueueStatus}>
        Refresh Status
      </button>
    </div>
  )
}

export default Queue
