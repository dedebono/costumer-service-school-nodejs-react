import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { toLocalTime } from '../lib/utils'
import io from 'socket.io-client'
import Swal from 'sweetalert2'

export default function Kiosk() {
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  })
  const [loading, setLoading] = useState(false)
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState('')
  const socketRef = useRef(null)

  useEffect(() => {
    loadServices()
  }, [])

  useEffect(() => {
    if (ticket) {
      socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
        transports: ['websocket', 'polling']
      });

      socketRef.current.on('connect', () => {
        console.log('Connected to socket server for ticket updates');
        socketRef.current.emit('join-ticket', ticket.id);
      });

      socketRef.current.on('ticket-update', (data) => {
        console.log('Ticket update received:', data);
        setTicket(prev => ({ ...prev, ...data }));
        if (data.status === 'CALLED') {
          Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true,
            icon: 'info',
            title: `Your ticket ${ticket.number} is now being called!`
          });
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log('Disconnected from socket server');
      });

      return () => {
        if (socketRef.current) {
          socketRef.current.disconnect();
        }
      };
    }
  }, [ticket])

  const loadServices = async () => {
    try {
      const data = await api.kiosk.getServices()
      setServices(data)
    } catch (err) {
      setError('Failed to load services')
      console.error(err)
    }
  }

  const handleServiceSelect = (service) => {
    setSelectedService(service)
    setError('')
  }

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedService) {
      setError('Please select a service')
      return
    }
    if (!formData.phone) {
      setError('Phone number is required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const ticketData = {
        ...formData,
        serviceId: selectedService.id
      }
      const result = await api.kiosk.createQueueTicket(ticketData)
      setTicket(result.ticket)
    } catch (err) {
      setError(err.message || 'Failed to create queue ticket')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedService(null)
    setFormData({ name: '', email: '', phone: '', notes: '' })
    setTicket(null)
    setError('')
  }

  if (ticket) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Queue Ticket Created!</h1>
            <p className="text-gray-600">Please save this ticket number for your records.</p>
          </div>

          <div className="bg-gray-50 rounded-lg p-6 mb-6">
            <div className="text-4xl font-bold text-blue-600 mb-2">{ticket.number}</div>
            <div className="text-sm text-gray-600">Ticket Number</div>
          </div>

          <div className="text-left space-y-2 mb-6">
            <div><strong>Service:</strong> {ticket.service_name}</div>
            <div><strong>Created:</strong> {toLocalTime(ticket.created_at)}</div>
            <div><strong>Status:</strong> <span className={`px-2 py-1 rounded-full text-xs ${
              ticket.status === 'WAITING' ? 'bg-yellow-100 text-yellow-800' :
              ticket.status === 'CALLED' ? 'bg-blue-100 text-blue-800' :
              ticket.status === 'IN_SERVICE' ? 'bg-green-100 text-green-800' :
              'bg-gray-100 text-gray-800'
            }`}>{ticket.status}</span></div>
            {ticket.queue_position && ticket.status === 'WAITING' && (
              <div><strong>Queue Position:</strong> {ticket.queue_position}</div>
            )}
          </div>

          <div className="text-sm text-gray-600 mb-6">
            {ticket.status === 'WAITING' && (
              <p>Please wait for your number to be called. You can check your position on the display screens.</p>
            )}
            {ticket.status === 'CALLED' && (
              <p>Your ticket is now being called! Please proceed to the counter.</p>
            )}
            {ticket.status === 'IN_SERVICE' && (
              <p>You are currently being served.</p>
            )}
            {ticket.status === 'DONE' && (
              <p>Your service has been completed.</p>
            )}
          </div>

          <button
            onClick={resetForm}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Create Another Ticket
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Customer Kiosk</h1>
          <p className="text-gray-600">Select a service and join the queue</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error}
          </div>
        )}

        {!selectedService ? (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Select a Service</h2>
            <div className="space-y-3">
              {services.map(service => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                >
                  <div className="font-medium text-gray-900">{service.name}</div>
                  <div className="text-sm text-gray-600">Code: {service.code_prefix}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold">Customer Information</h2>
              <button
                onClick={() => setSelectedService(null)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                Change Service
              </button>
            </div>

            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="font-medium text-blue-900">Selected Service</div>
              <div className="text-blue-700">{selectedService.name}</div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Any additional notes or special requirements"
                />
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => setSelectedService(null)}
                  className="flex-1 bg-gray-200 text-gray-800 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? 'Creating Ticket...' : 'Get Queue Ticket'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
