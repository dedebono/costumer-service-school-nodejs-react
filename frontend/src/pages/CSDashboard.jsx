import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { toLocalTime } from '../lib/utils'
import io from 'socket.io-client'

const STATUS_COLORS = {
  WAITING: 'bg-yellow-100 text-yellow-800',
  CALLED: 'bg-blue-100 text-blue-800',
  IN_SERVICE: 'bg-green-100 text-green-800',
  DONE: 'bg-gray-100 text-gray-800',
  NO_SHOW: 'bg-red-100 text-red-800',
  CANCELED: 'bg-gray-100 text-gray-800'
}

export default function CSDashboard() {
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [queue, setQueue] = useState([])
  const [activeTicket, setActiveTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [supportNotes, setSupportNotes] = useState('')
  const socketRef = useRef(null)

  useEffect(() => {
    loadServices()
    setupSocket()

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    if (selectedService) {
      loadQueue()
      joinQueueRoom()
    }
  }, [selectedService])

  const setupSocket = () => {
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server')
    })

    socketRef.current.on('queue-update', (data) => {
      console.log('Queue update received:', data)
      if (selectedService && data.serviceId === selectedService.id) {
        loadQueue() // Refresh queue when updates come in
      }
    })

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from socket server')
    })
  }

  const joinQueueRoom = () => {
    if (socketRef.current && selectedService) {
      socketRef.current.emit('join-queue', selectedService.id)
    }
  }

  const loadServices = async () => {
    try {
      const data = await api.services.getAll()
      setServices(data)
      if (data.length > 0 && !selectedService) {
        setSelectedService(data[0])
      }
    } catch (err) {
      setError('Failed to load services')
      console.error(err)
    }
  }

  const loadQueue = async () => {
    if (!selectedService) return

    try {
      const data = await api.queue.getQueue(selectedService.id, null, 100)
      setQueue(data)

      // Find active ticket (CALLED or IN_SERVICE)
      const active = data.find(ticket =>
        ticket.status === 'CALLED' || ticket.status === 'IN_SERVICE'
      )
      setActiveTicket(active || null)
    } catch (err) {
      console.error('Failed to load queue:', err)
    }
  }

  const handleClaimTicket = async (ticketId) => {
    setLoading(true)
    try {
      await api.queue.claimTicket(ticketId)
      await loadQueue()
    } catch (err) {
      setError(err.message || 'Failed to claim ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleStartService = async (ticketId) => {
    setLoading(true)
    try {
      await api.queue.startService(ticketId)
      await loadQueue()
    } catch (err) {
      setError(err.message || 'Failed to start service')
    } finally {
      setLoading(false)
    }
  }

  const handleResolveTicket = async (ticketId) => {
    if (!supportNotes.trim()) {
      setError('Please enter resolution notes')
      return
    }

    setLoading(true)
    try {
      await api.queue.resolveTicket(ticketId, supportNotes)
      setSupportNotes('')
      await loadQueue()
    } catch (err) {
      setError(err.message || 'Failed to resolve ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleRequeueTicket = async (ticketId) => {
    setLoading(true)
    try {
      await api.queue.requeueTicket(ticketId, 'Requeued by CS')
      await loadQueue()
    } catch (err) {
      setError(err.message || 'Failed to requeue ticket')
    } finally {
      setLoading(false)
    }
  }

  const handleMarkNoShow = async (ticketId) => {
    setLoading(true)
    try {
      await api.queue.markNoShow(ticketId)
      await loadQueue()
    } catch (err) {
      setError(err.message || 'Failed to mark as no-show')
    } finally {
      setLoading(false)
    }
  }

  const handleCancelTicket = async (ticketId) => {
    setLoading(true)
    try {
      await api.queue.cancelTicket(ticketId, 'Canceled by CS')
      await loadQueue()
    } catch (err) {
      setError(err.message || 'Failed to cancel ticket')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Customer Service Dashboard</h1>
            <div className="flex items-center space-x-4">
              <button
                onClick={loadQueue}
                className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 text-sm"
              >
                Reload Queue
              </button>
              <select
                value={selectedService?.id || ''}
                onChange={(e) => {
                  const service = services.find(s => s.id === parseInt(e.target.value))
                  setSelectedService(service)
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {services.map(service => (
                  <option key={service.id} value={service.id}>
                    {service.name} ({service.code_prefix})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
            <button
              onClick={() => setError('')}
              className="float-right ml-4 text-red-400 hover:text-red-600"
            >
              ×
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Active Ticket Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h2 className="text-xl font-semibold mb-4">Active Ticket</h2>

              {activeTicket ? (
                <div className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600 mb-2">
                      {activeTicket.number}
                    </div>
                    <div className="text-sm text-gray-600">
                      {activeTicket.customer_name || 'Anonymous'}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div><strong>Status:</strong>
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs ${STATUS_COLORS[activeTicket.status]}`}>
                        {activeTicket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div><strong>Phone:</strong> {activeTicket.customer_phone}</div>
                    <div><strong>Created:</strong> {toLocalTime(activeTicket.created_at)}</div>
                    {activeTicket.notes && (
                      <div><strong>Notes:</strong> {activeTicket.notes}</div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {activeTicket.status === 'CALLED' && (
                      <button
                        onClick={() => handleStartService(activeTicket.id)}
                        disabled={loading}
                        className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        Start Service
                      </button>
                    )}

                    {activeTicket.status === 'IN_SERVICE' && (
                      <div className="space-y-2">
                        <textarea
                          value={supportNotes}
                          onChange={(e) => setSupportNotes(e.target.value)}
                          placeholder="Enter resolution notes..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          rows={3}
                        />
                        <button
                          onClick={() => handleResolveTicket(activeTicket.id)}
                          disabled={loading || !supportNotes.trim()}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          Resolve Ticket
                        </button>
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleRequeueTicket(activeTicket.id)}
                        disabled={loading}
                        className="flex-1 bg-yellow-600 text-white py-2 px-3 rounded-lg hover:bg-yellow-700 disabled:opacity-50 text-sm"
                      >
                        Requeue
                      </button>
                      <button
                        onClick={() => handleMarkNoShow(activeTicket.id)}
                        disabled={loading}
                        className="flex-1 bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                      >
                        No Show
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  No active ticket
                </div>
              )}
            </div>
          </div>

          {/* Queue List */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">Queue ({queue.length} tickets)</h2>
                <button
                  onClick={loadQueue}
                  className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-sm"
                >
                  Reload
                </button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {queue.map((ticket, index) => (
                  <div
                    key={ticket.id}
                    className={`p-4 border rounded-lg ${
                      ticket.status === 'WAITING' ? 'border-yellow-200 bg-yellow-50' :
                      ticket.status === 'CALLED' ? 'border-blue-200 bg-blue-50' :
                      ticket.status === 'IN_SERVICE' ? 'border-green-200 bg-green-50' :
                      'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-lg font-bold text-gray-900">
                          {ticket.number}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">
                            {ticket.customer_name || 'Anonymous'}
                          </div>
                          <div className="text-sm text-gray-600">
                            {toLocalTime(ticket.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${STATUS_COLORS[ticket.status]}`}>
                          {ticket.status.replace('_', ' ')}
                        </span>

                        {ticket.status === 'WAITING' && (
                          <button
                            onClick={() => handleClaimTicket(ticket.id)}
                            disabled={loading}
                            className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                          >
                            Claim
                          </button>
                        )}

                        {(ticket.status === 'CALLED' || ticket.status === 'IN_SERVICE') && (
                          <button
                            onClick={() => handleCancelTicket(ticket.id)}
                            disabled={loading}
                            className="bg-red-600 text-white px-3 py-1 rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>

                    {ticket.notes && (
                      <div className="mt-2 text-sm text-gray-600">
                        <strong>Notes:</strong> {ticket.notes}
                      </div>
                    )}
                  </div>
                ))}

                {queue.length === 0 && (
                  <div className="text-center text-gray-500 py-8">
                    No tickets in queue
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
