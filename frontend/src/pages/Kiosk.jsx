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
      <div className="page safe" style={{ 
        minHeight: '100vh', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        padding: 'var(--space-4)'
      }}>
        <div className="surface" style={{ 
          maxWidth: '480px', 
          width: '100%', 
          padding: 'var(--space-8)', 
          textAlign: 'center' 
        }}>
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ 
              width: '4rem', 
              height: '4rem', 
              background: 'color-mix(in oklab, var(--clr-accent) 20%, var(--clr-bg))', 
              borderRadius: '50%', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              margin: '0 auto var(--space-4)' 
            }}>
              <svg style={{ width: '2rem', height: '2rem', color: 'var(--clr-accent)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 style={{ 
              fontSize: 'var(--fs-700)', 
              fontWeight: '700', 
              margin: '0 0 var(--space-2)', 
              color: 'var(--clr-text)' 
            }}>
              Queue Ticket Created!
            </h1>
            <p style={{ 
              fontSize: 'var(--fs-400)', 
              opacity: '0.8', 
              margin: 0 
            }}>
              Please save this ticket number for your records.
            </p>
          </div>

          <div className="surface" style={{ 
            background: 'var(--clr-surface-2)', 
            padding: 'var(--space-6)', 
            marginBottom: 'var(--space-6)' 
          }}>
            <div style={{ 
              fontSize: 'clamp(2rem, 8vw, 3rem)', 
              fontWeight: '700', 
              color: 'var(--clr-primary)', 
              marginBottom: 'var(--space-2)' 
            }}>
              {ticket.number}
            </div>
            <div style={{ 
              fontSize: 'var(--fs-300)', 
              opacity: '0.7' 
            }}>
              Ticket Number
            </div>
          </div>

          <div style={{ 
            textAlign: 'left', 
            display: 'grid', 
            gap: 'var(--space-2)', 
            marginBottom: 'var(--space-6)',
            fontSize: 'var(--fs-400)'
          }}>
            <div><strong>Service:</strong> {ticket.service_name}</div>
            <div><strong>Created:</strong> {toLocalTime(ticket.created_at)}</div>
            <div>
              <strong>Status:</strong> 
              <span className={`badge ${
                ticket.status === 'WAITING' ? 'tag-accent' :
                ticket.status === 'CALLED' ? 'tag-primary' :
                ticket.status === 'IN_SERVICE' ? 'badge' :
                'badge'
              }`} style={{ marginLeft: 'var(--space-2)' }}>
                {ticket.status}
              </span>
            </div>
            {ticket.queue_position && ticket.status === 'WAITING' && (
              <div><strong>Queue Position:</strong> {ticket.queue_position}</div>
            )}
          </div>

          <div style={{ 
            fontSize: 'var(--fs-300)', 
            opacity: '0.8', 
            marginBottom: 'var(--space-6)',
            lineHeight: '1.6'
          }}>
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
            className="btn btn--primary btn--lg w-full"
            style={{ 
              minHeight: '3.5rem',
              fontSize: 'var(--fs-500)',
              fontWeight: '600'
            }}
          >
            Create Another Ticket
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="page safe" style={{ 
      minHeight: '100vh', 
      padding: 'var(--space-6) var(--space-4)' 
    }}>
      <div style={{ 
        maxWidth: '480px', 
        margin: '0 auto' 
      }}>
        <div style={{ 
          textAlign: 'center', 
          marginBottom: 'var(--space-8)' 
        }}>
          <h1 style={{ 
            fontSize: 'clamp(1.8rem, 6vw, 2.5rem)', 
            fontWeight: '700', 
            margin: '0 0 var(--space-2)', 
            color: 'var(--clr-text)' 
          }}>
            Customer Kiosk
          </h1>
          <p style={{ 
            fontSize: 'var(--fs-400)', 
            opacity: '0.8', 
            margin: 0 
          }}>
            Select a service and join the queue
          </p>
        </div>

        {error && (
          <div className="surface" style={{ 
            background: 'color-mix(in oklab, red 10%, var(--clr-bg))', 
            border: '1px solid color-mix(in oklab, red 30%, transparent)',
            color: 'color-mix(in oklab, red 80%, black)',
            padding: 'var(--space-4)',
            marginBottom: 'var(--space-6)',
            fontSize: 'var(--fs-400)'
          }}>
            {error}
          </div>
        )}

        {!selectedService ? (
          <div className="surface" style={{ padding: 'var(--space-6)' }}>
            <h2 style={{ 
              fontSize: 'var(--fs-600)', 
              fontWeight: '600', 
              marginBottom: 'var(--space-4)' 
            }}>
              Select a Service
            </h2>
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              {services.map(service => (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service)}
                  className="surface"
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: 'var(--space-5)',
                    border: '2px solid var(--clr-border)',
                    background: 'var(--clr-bg)',
                    cursor: 'pointer',
                    transition: 'all var(--dur-2) var(--ease-out)',
                    minHeight: '4rem',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.borderColor = 'var(--clr-primary)'
                    e.target.style.background = 'color-mix(in oklab, var(--clr-primary) 5%, var(--clr-bg))'
                  }}
                  onMouseOut={(e) => {
                    e.target.style.borderColor = 'var(--clr-border)'
                    e.target.style.background = 'var(--clr-bg)'
                  }}
                >
                  <div style={{ 
                    fontWeight: '600', 
                    fontSize: 'var(--fs-500)',
                    marginBottom: 'var(--space-1)'
                  }}>
                    {service.name}
                  </div>
                  <div style={{ 
                    fontSize: 'var(--fs-300)', 
                    opacity: '0.7' 
                  }}>
                    Code: {service.code_prefix}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="surface" style={{ padding: 'var(--space-6)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
              <h2 style={{ 
                fontSize: 'var(--fs-600)', 
                fontWeight: '600', 
                margin: 0 
              }}>
                Customer Information
              </h2>
              <button
                onClick={() => setSelectedService(null)}
                className="btn btn--ghost btn--sm"
              >
                Change Service
              </button>
            </div>

            <div className="surface" style={{ 
              marginBottom: 'var(--space-4)', 
              padding: 'var(--space-3)', 
              background: 'color-mix(in oklab, var(--clr-primary) 10%, var(--clr-bg))',
              border: '1px solid color-mix(in oklab, var(--clr-primary) 20%, transparent)'
            }}>
              <div style={{ 
                fontWeight: '600', 
                color: 'var(--clr-primary)',
                marginBottom: 'var(--space-1)'
              }}>
                Selected Service
              </div>
              <div style={{ 
                color: 'var(--clr-primary)', 
                fontSize: 'var(--fs-500)' 
              }}>
                {selectedService.name}
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: 'var(--fs-400)', 
                  fontWeight: '600', 
                  marginBottom: 'var(--space-2)' 
                }}>
                  Phone Number *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="input"
                  style={{ 
                    fontSize: 'var(--fs-400)',
                    minHeight: '3rem'
                  }}
                  placeholder="Enter your phone number"
                  required
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: 'var(--fs-400)', 
                  fontWeight: '600', 
                  marginBottom: 'var(--space-2)' 
                }}>
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input"
                  style={{ 
                    fontSize: 'var(--fs-400)',
                    minHeight: '3rem'
                  }}
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: 'var(--fs-400)', 
                  fontWeight: '600', 
                  marginBottom: 'var(--space-2)' 
                }}>
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="input"
                  style={{ 
                    fontSize: 'var(--fs-400)',
                    minHeight: '3rem'
                  }}
                  placeholder="Enter your email"
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: 'var(--fs-400)', 
                  fontWeight: '600', 
                  marginBottom: 'var(--space-2)' 
                }}>
                  Notes
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleInputChange}
                  rows={3}
                  className="textarea"
                  style={{ 
                    fontSize: 'var(--fs-400)',
                    minHeight: '4rem'
                  }}
                  placeholder="Any additional notes or special requirements"
                />
              </div>

              <div className="flex gap-3" style={{ marginTop: 'var(--space-2)' }}>
                <button
                  type="button"
                  onClick={() => setSelectedService(null)}
                  className="btn btn--outline btn--lg"
                  style={{ 
                    flex: 1,
                    minHeight: '3.5rem',
                    fontSize: 'var(--fs-400)'
                  }}
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn--primary btn--lg"
                  style={{ 
                    flex: 1,
                    minHeight: '3.5rem',
                    fontSize: 'var(--fs-400)',
                    fontWeight: '600'
                  }}
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
