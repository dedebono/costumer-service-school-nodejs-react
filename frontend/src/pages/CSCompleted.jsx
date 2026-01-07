// src/pages/CSCompleted.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api } from '../api'
import { toLocalTime } from '../lib/utils'
import Swal from 'sweetalert2'
import Modal from '../components/modal.jsx'

const COMPLETED_SET = new Set(['NO_SHOW', 'DONE', 'CANCELED'])

// Distinct badge styles for each completed status
const STATUS_BADGE_STYLES = {
  DONE:     { background: '#16a34a', color: '#ffffff' }, // green
  NO_SHOW:  { background: '#f59e0b', color: '#111111' }, // amber
  CANCELED: { background: '#b91c1c', color: '#ffffff' }, // red
}
// Nice labels for UI
const STATUS_LABEL = {
  DONE: 'Done',
  NO_SHOW: 'No Show',
  CANCELED: 'Cancelled', // UI uses "Cancelled" while API uses "CANCELED"
}

export default function CSCompleted() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState('all')
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filter, setFilter] = useState('ALL') // ALL | DONE | NO_SHOW | CANCELED

  useEffect(() => {
    (async () => {
      try {
        const data = await api.services.getAll()
        setServices(data)
        // preselect from ?service=
        const serviceIdParam = parseInt(params.get('service') || '0', 10)
        const initial = serviceIdParam ? data.find(s => s.id === serviceIdParam) : data[0]
        setSelectedService(initial || null)
      } catch (e) {
        setError('Failed to load services')
      }
    })()
  }, [params])

  useEffect(() => {
    if (!selectedService) return
    loadCompleted()
  }, [selectedService])

  const loadCompleted = async () => {
    if (!selectedService) return
    setLoading(true)
    setError('')
    try {
      let data = []
      if (selectedService === 'all') {
        // Fetch completed tickets from all services and combine them
        const allQueues = await Promise.all(
          services.map(service => api.queue.getQueue(service.id, null, 500))
        )
        data = allQueues.flat()
      } else {
        data = await api.queue.getQueue(selectedService.id, null, 500)
      }
      setTickets(Array.isArray(data) ? data.filter(t => COMPLETED_SET.has(t.status)) : [])
    } catch (e) {
      setError(e?.message || 'Failed to load completed tickets')
    } finally {
      setLoading(false)
    }
  }

  // CSV helpers
  const safe = (v) => String(v ?? '').replace(/"/g, '""')
  const formatISO = (v) => { if (!v) return ''; try { return new Date(v).toISOString() } catch { return String(v) } }
  const formatTotalTime = (start, end) => {
    if (!start || !end) return '';
    const diff = (new Date(end) - new Date(start)) / 1000 / 60;
    return diff.toFixed(1) + ' min';
  }
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
      if (!filteredTickets.length) {
        await Swal.fire({ icon: 'info', title: 'Nothing to export', text: 'No tickets in the current view.' })
        return
      }
      const rows = filteredTickets.map(t => ({
        ID: t.id,
        Number: t.number,
        Status: STATUS_LABEL[t.status] || t.status,
        'Customer Name': t.customer_name || t.queue_customer_name || '',
        'Customer Phone': t.customer_phone || t.queue_customer_phone || '',
        'Customer Email': t.customer_email || '',
        'Created At (ISO)': formatISO(t.created_at),
        'Total Timer (min)': formatTotalTime(t.timer_start, t.timer_end),
        Notes: t.notes || ''
      }))
      const csv = toCSV(rows)
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const name = selectedService === 'all' ? 'all-services' : selectedService?.code_prefix || selectedService?.name || 'completed'
      const a = document.createElement('a')
      a.href = url
      a.download = `${name}-completed-${filter === 'ALL' ? 'all' : filter.toLowerCase()}-${timestamp()}.csv`
      document.body.appendChild(a); a.click(); a.remove()
      URL.revokeObjectURL(url)
    } catch (e) {
      await Swal.fire({ icon: 'error', title: 'Export failed', text: e.message || 'Unknown error' })
    }
  }

  const countByStatus = useMemo(() => {
    const res = { DONE: 0, NO_SHOW: 0, CANCELED: 0 }
    for (const t of tickets) if (res[t.status] !== undefined) res[t.status]++
    return res
  }, [tickets])

  const filteredTickets = useMemo(() => {
    if (filter === 'ALL') return tickets
    return tickets.filter(t => t.status === filter)
  }, [tickets, filter])

  return (
    <div className="page">
      <div className="w-full">
        <header>
          <div className="container-antrian">
            <h1>SELESAI</h1>
            <select
              value={selectedService === 'all' ? 'all' : selectedService?.id || ''}
              onChange={(e) => {
                if (e.target.value === 'all') {
                  setSelectedService('all')
                } else {
                  const id = parseInt(e.target.value)
                  const svc = services.find(s => s.id === id)
                  setSelectedService(svc || null)
                }
              }}
            style={{ display: 'inline-block',
                color: 'var(--clr-text)',
                padding: 'var(--space-2)',
                border: '1px solid var(--clr-border)',
                borderRadius: '4px',
                background: 'var(--clr-bg)',
                fontSize: 'var(--fs-400)',
                minWidth: '200px',
                width:'70%'
         }}
              title="Select service"
            >
              <option value="all">All Services</option>
              {services.map(service => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.code_prefix})
                </option>
              ))}
            </select>

            <div style={{ display:'flex',gap:'10px' , borderRadius:'10px' }}>
              {/* Status filter: choose one status (or All) */}
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="select"
                title="Filter by status"
              >
                <option value="ALL">All</option>
                <option value="DONE">Done</option>
                <option value="NO_SHOW">No Show</option>
                <option value="CANCELED">Cancelled</option>
              </select>

              <button onClick={exportCSV} className="btn">Export</button>
              <button onClick={loadCompleted} className="btn btn--primary btn--sm">Reload</button>
            </div>
          </div>
        </header>

        <main className="container-2" style={{ paddingTop: 'var(--space-6)', 
          paddingBottom: 'var(--space-6)' , 
          background: 'var(--clr-bg)' ,
          height:'fit-content' }}>
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
                style={{ position: 'absolute', top: 'var(--space-2)', 
                  right: 'var(--space-2)', background: 'none', 
                  border: 'none', fontSize: 'var(--fs-500)', cursor: 'pointer' }}
              >×</button>
            </div>
          )}

          <div className="surface-2" style={{ 
          padding: 'var(--space-4)' , 
          border: '1px solid var(--clr-border)' ,
          borderRadius: 'var(--space-2)',
          background: 'var(--clr-bg)' ,
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' ,
          marginBottom: 'var(--space-6)' ,
          minHeight: '500px',
          width:'100%' ,
          boxSizing: 'border-box',
          height:'100%'
           }}>
            {/* colored counts */}
            <div className="flex items-center gap-3" style={{ marginBottom: 'var(--space-3)' }}>
              <span style={{ ...badgeBase, ...STATUS_BADGE_STYLES.DONE }}>{STATUS_LABEL.DONE}: {countByStatus.DONE}</span>
              <span style={{ ...badgeBase, ...STATUS_BADGE_STYLES.NO_SHOW }}>{STATUS_LABEL.NO_SHOW}: {countByStatus.NO_SHOW}</span>
              <span style={{ ...badgeBase, ...STATUS_BADGE_STYLES.CANCELED }}>{STATUS_LABEL.CANCELED}: {countByStatus.CANCELED}</span>
              <span style={{ opacity: 0.6, marginLeft: 'auto' }}>
                {filter === 'ALL' ? 'All' : STATUS_LABEL[filter]} • {filteredTickets.length}
              </span>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', opacity: 0.6 }}>Loading…</div>
            ) : filteredTickets.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)', opacity: 0.6 }}>No completed tickets</div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
                  gap: 'var(--space-3)',
                  maxHeight: '100%',
                  overflowY: 'auto'
                }}
              >
                {filteredTickets
                  .slice()
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .map((t) => (
                    <div
                      key={t.id}
                      className="surface"
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        alignItems: 'center',
                        fontSize: 'var(--fs-300)',
                        padding: 'var(--space-4)',
                        border: '1px solid var(--clr-border)',
                        opacity: 0.95,
                        cursor: 'pointer',
                      }}
                      onClick={() => {
                        setSelectedTicket(t)
                        setShowModal(true)
                      }}
                    >
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--fs-500)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>
                          {t.number}
                        </div>
                        <div style={{ fontSize: 'var(--fs-300)', opacity: 0.8 }}>
                          {t.customer_name || t.queue_customer_name || 'Anonymous'}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </div>
        </main>

        {showModal && selectedTicket && (
          <Modal open={showModal} title="Ticket Details" onClose={() => setShowModal(false)}>
            <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
              <div>
                <strong>Number:</strong> {selectedTicket.number}
              </div>
              <div>
                <strong>Status:</strong>
                <span style={{ ...badgeBase, ...(STATUS_BADGE_STYLES[selectedTicket.status] || {}), marginLeft: 'var(--space-2)' }}>
                  {STATUS_LABEL[selectedTicket.status] || selectedTicket.status}
                </span>
              </div>
              <div>
                <strong>Customer Name:</strong> {selectedTicket.customer_name || selectedTicket.queue_customer_name || 'Anonymous'}
              </div>
              <div>
                <strong>Phone:</strong> {selectedTicket.customer_phone || selectedTicket.queue_customer_phone || '-'}
              </div>
              <div>
                <strong>Email:</strong> {selectedTicket.customer_email || '-'}
              </div>
              <div>
                <strong>Created:</strong> {toLocalTime(selectedTicket.created_at)}
              </div>
              <div>
                <strong>Total Time:</strong> {formatTotalTime(selectedTicket.timer_start, selectedTicket.timer_end)}
              </div>
              {selectedTicket.customer_service_username && (
                <div>
                  <strong>Handled by:</strong> {selectedTicket.customer_service_username}
                </div>
              )}
              {selectedTicket.notes && (
                <div>
                  <strong>Notes:</strong> {selectedTicket.notes}
                </div>
              )}
            </div>
          </Modal>
        )}
      </div>
    </div>
  )
}

// Small shared badge base style
const badgeBase = {
  display: 'inline-block',
  padding: '0.2rem 0.5rem',
  borderRadius: '999px',
  fontSize: 'var(--fs-300)',
  lineHeight: 1,
  fontWeight: 600,
}
