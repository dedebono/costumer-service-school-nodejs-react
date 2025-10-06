// src/pages/CSDashboard.jsx
import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { toLocalTime } from '../lib/utils'
import io from 'socket.io-client'
import Swal from 'sweetalert2'

const STATUS_COLORS = {
  WAITING: 'tag-accent',
  CALLED: 'tag-primary',
  IN_SERVICE: 'badge',
  DONE: 'badge',
  NO_SHOW: 'badge',
  CANCELED: 'badge'
}

export default function CSDashboard() {
  const navigate = useNavigate()
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [queue, setQueue] = useState([])
  const [activeTicket, setActiveTicket] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [supportNotes, setSupportNotes] = useState('')
  const [pipelines, setPipelines] = useState([])
  const socketRef = useRef(null)

  useEffect(() => {
    loadServices()
    setupSocket()
    return () => { if (socketRef.current) socketRef.current.disconnect() }
  }, [])

  useEffect(() => {
    if (selectedService) {
      loadQueue()
      joinQueueRoom()
    }
  }, [selectedService])

  const setupSocket = () => {
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL, { transports: ['websocket', 'polling'] })
    socketRef.current.on('connect', () => console.log('Connected to socket server'))
    socketRef.current.on('queue-update', (data) => {
      if (selectedService && data.serviceId === selectedService.id) loadQueue()
    })
    socketRef.current.on('disconnect', () => console.log('Disconnected from socket server'))
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
      if (data.length > 0 && !selectedService) setSelectedService(data[0])
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
      const active = data.find(t => t.status === 'CALLED' || t.status === 'IN_SERVICE')
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
    if (!selectedService || !activeTicket) return
    const connectionType = selectedService.connection_type || 'none'

    if (connectionType === 'ticket') {
      const customerData = {
        name: activeTicket.customer_name || activeTicket.queue_customer_name || '',
        phone: activeTicket.customer_phone || activeTicket.queue_customer_phone || '',
        email: activeTicket.customer_email || activeTicket.queue_customer_email || ''
      }
      sessionStorage.setItem('queueTicketData', JSON.stringify({
        prefillData: customerData,
        autoSearch: false,
        fromQueue: true,
        queueTicketId: ticketId
      }))
      window.location.hash = '#create'
      window.location.reload()
      return
    }

    if (connectionType === 'admission') {
      try {
        const pipelinesData = await api.admission.getPipelines()
        setPipelines(pipelinesData)
        if (pipelinesData.length === 0) { setError('No admission pipelines available'); return }

        const { value: selectedPipelineId } = await Swal.fire({
          title: 'Select Pipeline',
          html: `
            <div style="text-align: left;">
              <label for="pipeline-select" style="display: block; margin-bottom: 8px; font-weight: bold;">Choose Pipeline:</label>
              <select id="pipeline-select" style="width: 100%; padding: 8px; border: 1px solid #ccc; border-radius: 4px;">
                ${pipelinesData.map(p => `<option value="${p.id}">${p.name}</option>`).join('')}
              </select>
            </div>
          `,
          showCancelButton: true,
          confirmButtonText: 'Create Applicant',
          cancelButtonText: 'Cancel',
          preConfirm: () => parseInt(document.getElementById('pipeline-select').value)
        })

        if (selectedPipelineId) {
          setLoading(true)
          try {
            const applicantData = {
              pipelineId: selectedPipelineId,
              customerName: activeTicket.customer_name || activeTicket.queue_customer_name || 'Queue Customer',
              customerPhone: activeTicket.customer_phone || activeTicket.queue_customer_phone || '',
              customerEmail: activeTicket.customer_email || activeTicket.queue_customer_email || ''
            }
            await api.admission.autoCreateApplicant(applicantData)
            await api.queue.resolveTicket(ticketId, `Converted to admission applicant in pipeline`)
            Swal.fire({ icon: 'success', title: 'Applicant Created', text: 'Queue customer has been converted to admission applicant successfully.' })
            await loadQueue()
          } catch (err) {
            setError(err.message || 'Failed to create applicant')
          } finally {
            setLoading(false)
          }
        }
      } catch (err) {
        setError('Failed to load pipelines')
        console.error(err)
      }
      return
    }

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
    if (!supportNotes.trim()) { setError('Please enter resolution notes'); return }
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

  /* ===== CSV Export (current queue) ===== */
  const safe = (v) => String(v ?? '').replace(/"/g, '""')
  const formatISO = (v) => { if (!v) return ''; try { return new Date(v).toISOString() } catch { return String(v) } }
  const toCSV = (rows) => {
    if (!rows.length) return ''
    const headers = Object.keys(rows[0])
    const lines = [
      headers.map(h => `"${safe(h)}"`).join(','),
      ...rows.map(r => headers.map(h => `"${safe(r[h])}"`).join(',')),
    ]
    return '\uFEFF' + lines.join('\r\n')
  }
  const timestamp = () => {
    const d = new Date(); const pad = (n) => String(n).padStart(2, '0')
    return `${d.getFullYear()}${pad(d.getMonth()+1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
  }
  const exportCSV = async () => {
    try {
      if (!queue.length) {
        await Swal.fire({ icon: 'info', title: 'Nothing to export', text: 'Queue is empty.' })
        return
      }
      const rows = queue.map(t => ({
        ID: t.id,
        Number: t.number,
        Status: t.status,
        'Customer Name': t.customer_name || t.queue_customer_name || '',
        'Customer Phone': t.customer_phone || t.queue_customer_phone || '',
        'Customer Email': t.customer_email || t.queue_customer_email || '',
        'Created At (ISO)': formatISO(t.created_at),
        Notes: t.notes || ''
      }))
      const csv = toCSV(rows)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const name = selectedService?.code_prefix || selectedService?.name || 'queue'
      const a = document.createElement('a')
      a.href = url
      a.download = `${name}-tickets-${timestamp()}.csv`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error(e)
      await Swal.fire({ icon: 'error', title: 'Export failed', text: e.message || 'Unknown error' })
    }
  }

  return (
    <div className="page">
      <div className="w-full">
        <header>
          <div className="container-antrian">
            <h1>ANTRIAN</h1>
            <select
              value={selectedService?.id || ''}
              onChange={(e) => {
                const service = services.find(s => s.id === parseInt(e.target.value))
                setSelectedService(service)
              }}
              className="select"
            >
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.code_prefix})
                </option>
              ))}
            </select>
            <button onClick={loadQueue} className="btn btn--primary btn--sm">Refresh</button>
          </div>
        </header>

        <main className="container-2" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
          {error && (
            <div className="surface-2" style={{
              background: 'color-mix(in oklab, red 10%, var(--clr-bg))',
              border: '1px solid color-mix(in oklab, red 30%, transparent)',
              color: 'color-mix(in oklab, red 80%, black)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
              position: 'relative'
            }}>
              {error}
              <button
                onClick={() => setError('')}
                className="btn-icon"
                style={{
                  position: 'absolute', top: 'var(--space-2)', right: 'var(--space-2)',
                  background: 'none', border: 'none', fontSize: 'var(--fs-500)', cursor: 'pointer'
                }}
              >×</button>
            </div>
          )}

          <div className="grid grid--2" style={{ gap: 'var(--space-6)' }}>
            {/* Active Ticket Panel */}
            <div className="surface-2">
              <h2 style={{ fontSize: 'var(--fs-600)', fontWeight: '600', marginBottom: 'var(--space-4)' }}>ANTRIAN AKTIF</h2>
              {activeTicket ? (
                <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 'var(--fs-700)', fontWeight: '700', color: 'var(--clr-primary)', marginBottom: 'var(--space-2)' }}>
                      {activeTicket.number}
                    </div>
                    <div style={{ fontSize: 'var(--fs-300)', opacity: '0.8' }}>
                      {activeTicket.customer_name || activeTicket.queue_customer_name || 'Anonymous'}
                    </div>
                  </div>

                  <div style={{ display: 'grid', gap: 'var(--space-2)', fontSize: 'var(--fs-300)' }}>
                    <div><strong>Status:</strong>
                      <span className={`${STATUS_COLORS[activeTicket.status]}`} style={{ marginLeft: 'var(--space-2)' }}>
                        {activeTicket.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div><strong>Phone:</strong> {activeTicket.customer_phone || activeTicket.queue_customer_phone}</div>
                    <div><strong>Created:</strong> {toLocalTime(activeTicket.created_at)}</div>
                    {activeTicket.notes && (<div><strong>Notes:</strong> {activeTicket.notes}</div>)}
                  </div>

                  <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                    {activeTicket.status === 'CALLED' && (
                      <button onClick={() => handleStartService(activeTicket.id)} disabled={loading} className="btn btn--accent w-full">
                        Start Service
                      </button>
                    )}

                    {activeTicket.status === 'IN_SERVICE' && (
                      <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                        <textarea
                          value={supportNotes}
                          onChange={(e) => setSupportNotes(e.target.value)}
                          placeholder="Enter resolution notes..."
                          className="textarea"
                          rows={3}
                        />
                        <button
                          onClick={() => handleResolveTicket(activeTicket.id)}
                          disabled={loading || !supportNotes.trim()}
                          className="btn btn--primary w-full"
                        >
                          Resolve Ticket
                        </button>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button onClick={() => handleRequeueTicket(activeTicket.id)} disabled={loading} className="btn btn--outline btn--sm" style={{ flex: 1 }}>
                        Requeue
                      </button>
                      <button onClick={() => handleMarkNoShow(activeTicket.id)} disabled={loading} className="btn btn--outline btn--sm" style={{ flex: 1 }}>
                        No Show
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: 'var(--space-8)', opacity: '0.6' }}>No active ticket</div>
              )}
            </div>

            {/* Queue List */}
            <div className="surface-2">
              <div className="flex items-center justify-between mb-4">
                <h2 style={{ fontSize: 'var(--fs-600)', fontWeight: '600', margin: 0 }}>
                  ANTRIAN
                </h2>
                {/* RIGHT: Completed page + Export + Reload */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportCSV}
                    className="btn"
                    title="Export current queue to CSV"
                  >
                    Export CSV
                  </button>
                  <button onClick={loadQueue} className="btn btn--primary btn--sm">Reload</button>
                </div>
              </div>

              <div style={{ display: 'grid', gap: 'var(--space-4)' }}>
                {/* Active Queue (WAITING and CALLED) */}
                {(() => {
                  const activeTickets = queue.filter(t => t.status === 'WAITING' || t.status === 'CALLED')
                  return activeTickets.length > 0 && (
                    <div>
                      <h3 style={{ fontSize: 'var(--fs-500)', fontWeight: '600', marginBottom: 'var(--space-3)', color: 'var(--clr-primary)' }}>
                        Active Queue ({activeTickets.length})
                      </h3>
                      <div style={{ display: 'grid', gap: 'var(--space-3)', maxHeight: '500px', overflowY: 'auto' }}>
                        {activeTickets.map((ticket) => (
                          <div key={ticket.id} className="surface" style={{
                            padding: 'var(--space-4)',
                            border: ticket.status === 'WAITING' ? '2px solid var(--clr-accent)' : '2px solid var(--clr-primary)'
                          }}>
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4">
                                <div style={{ fontSize: 'var(--fs-500)', fontWeight: '700' }}>{ticket.number}</div>
                                <div>
                                  <div style={{ fontWeight: '600' }}>{ticket.customer_name || ticket.queue_customer_name || 'Anonymous'}</div>
                                  <div style={{ fontSize: 'var(--fs-300)', opacity: '0.7' }}>{toLocalTime(ticket.created_at)}</div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3">
                                <span className={`${STATUS_COLORS[ticket.status]}`}>{ticket.status.replace('_', ' ')}</span>
                                {ticket.status === 'WAITING' && (
                                  <button onClick={() => handleClaimTicket(ticket.id)} disabled={loading} className="btn btn--primary btn--sm">Claim</button>
                                )}
                                {ticket.status === 'CALLED' && (
                                  <button onClick={() => handleCancelTicket(ticket.id)} disabled={loading} className="btn btn--outline btn--sm">Cancel</button>
                                )}
                              </div>
                            </div>

                            {ticket.notes && (
                              <div style={{ marginTop: 'var(--space-2)', fontSize: 'var(--fs-300)', opacity: '0.8' }}>
                                <strong>Notes:</strong> {ticket.notes}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* (Completed moved to its own page) */}

                {queue.length === 0 && (
                  <div style={{ textAlign: 'center', padding: 'var(--space-8)', opacity: '0.6' }}>
                    No tickets in queue
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
