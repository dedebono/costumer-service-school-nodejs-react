import { useState, useEffect, useRef } from 'react'
import { api } from '../api'
import { toLocalTime } from '../lib/utils'
import io from 'socket.io-client'
import Swal from 'sweetalert2'

const STATUS_LABEL_ID = {
  WAITING: 'Menunggu',
  CALLED: 'Dipanggil',
  IN_SERVICE: 'Sedang Dilayani',
  DONE: 'Selesai',
  NO_SHOW: 'Tidak Hadir',
  CANCELED: 'Dibatalkan',
}

export default function Kiosk() {
  const [services, setServices] = useState([])
  const [selectedService, setSelectedService] = useState(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  })
  const [phoneError, setPhoneError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState('')
  const socketRef = useRef(null)

  // ——— helper validasi ———
  const normalizePhone = (val) => (val || '').replace(/\D/g, '').slice(0, 12)
  const isValidPhone = (val) => /^\d{11,12}$/.test(val || '')
  const isValidEmail = (v) =>
    /^[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,}$/i.test((v || '').trim())

  const phoneKeyGuard = (e) => {
    const k = e.key
    if (k === 'Enter') return
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End']
    if (allowed.includes(k)) return
    if (/^\d$/.test(k)) {
      if ((e.target.value || '').replace(/\D/g, '').length >= 12) e.preventDefault()
      return
    }
    e.preventDefault()
  }

  useEffect(() => {
    loadServices()
  }, [])

  useEffect(() => {
    if (ticket) {
      socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
        transports: ['websocket', 'polling']
      });

      socketRef.current.on('connect', () => {
        console.log('Terhubung ke server socket untuk pembaruan tiket');
        socketRef.current.emit('join-ticket', ticket.id);
      });

      socketRef.current.on('ticket-update', (data) => {
        console.log('Pembaruan tiket diterima:', data);
        setTicket(prev => ({ ...prev, ...data }));
        if (data.status === 'CALLED') {
          Swal.fire({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 5000,
            timerProgressBar: true,
            icon: 'info',
            title: `Nomor antrian ${data.number || ticket.number} sedang dipanggil!`
          });
        }
      });

      socketRef.current.on('disconnect', () => {
        console.log('Terputus dari server socket');
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
      setError('Gagal memuat layanan')
      console.error(err)
    }
  }

  const handleServiceSelect = (service) => {
    setSelectedService(service)
    setError('')
  }

  // Handler khusus agar validasi realtime
  const handlePhoneChange = (e) => {
    const val = normalizePhone(e.target.value)
    setFormData((s) => ({ ...s, phone: val }))
    if (!val) {
      setPhoneError('')
    } else if (!isValidPhone(val)) {
      setPhoneError('Nomor telepon harus 11–12 digit.')
    } else {
      setPhoneError('')
    }
  }

  const handleEmailChange = (e) => {
    const val = e.target.value
    setFormData((s) => ({ ...s, email: val }))
    if (!val.trim()) {
      setEmailError('') // opsional
    } else if (!isValidEmail(val)) {
      setEmailError('Masukkan email yang valid (nama@domain.com).')
    } else {
      setEmailError('')
    }
  }

  const handleBasicChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedService) {
      setError('Silakan pilih layanan')
      return
    }
    if (!formData.phone) {
      setPhoneError('Nomor telepon wajib diisi.')
      setError('Nomor telepon wajib diisi')
      return
    }
    if (!isValidPhone(formData.phone)) {
      setPhoneError('Nomor telepon harus 11–12 digit.')
      setError('Nomor telepon harus 11–12 digit.')
      await Swal.fire({ icon: 'error', title: 'Nomor telepon tidak valid', text: 'Nomor telepon harus 11–12 digit.' })
      return
    }
    if (formData.email && !isValidEmail(formData.email)) {
      setEmailError('Masukkan email yang valid (nama@domain.com).')
      setError('Format email tidak valid')
      await Swal.fire({ icon: 'error', title: 'Email tidak valid', text: 'Gunakan format yang benar (nama@domain.com).' })
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
      setError(err.message || 'Gagal membuat nomor antrian')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setSelectedService(null)
    setFormData({ name: '', email: '', phone: '', notes: '' })
    setPhoneError('')
    setEmailError('')
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
              Nomor Antrian Berhasil Dibuat!
            </h1>
            <p style={{ 
              fontSize: 'var(--fs-400)', 
              opacity: '0.8', 
              margin: 0 
            }}>
              Simpan nomor antrian ini.
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
              Nomor Antrian
            </div>
          </div>

          <div style={{ 
            textAlign: 'left', 
            display: 'grid', 
            gap: 'var(--space-2)', 
            marginBottom: 'var(--space-6)',
            fontSize: 'var(--fs-400)'
          }}>
            <div><strong>Layanan:</strong> {ticket.service_name}</div>
            <div><strong>Dibuat:</strong> {toLocalTime(ticket.created_at)}</div>
            <div>
              <strong>Status:</strong> 
              <span className="badge" style={{ marginLeft: 'var(--space-2)' }}>
                {STATUS_LABEL_ID[ticket.status] || ticket.status}
              </span>
            </div>
            {ticket.queue_position && ticket.status === 'WAITING' && (
              <div><strong>Posisi Antrian:</strong> {ticket.queue_position}</div>
            )}
          </div>

          <div style={{ 
            fontSize: 'var(--fs-300)', 
            opacity: '0.8', 
            marginBottom: 'var(--space-6)',
            lineHeight: '1.6'
          }}>
            {ticket.status === 'WAITING' && (
              <p>Silakan menunggu sampai nomor Anda dipanggil. Anda dapat melihat posisi antrian di layar.</p>
            )}
            {ticket.status === 'CALLED' && (
              <p>Nomor Anda sedang dipanggil. Silakan menuju loket.</p>
            )}
            {ticket.status === 'IN_SERVICE' && (
              <p>Anda sedang dilayani.</p>
            )}
            {ticket.status === 'DONE' && (
              <p>Layanan Anda telah selesai.</p>
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
            Buat Tiket Lain
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
      <div style={{ maxWidth: '480px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
          <h1 style={{ 
            fontSize: 'clamp(1.8rem, 6vw, 2.5rem)', 
            fontWeight: '700', 
            margin: '0 0 var(--space-2)', 
            color: 'var(--clr-text)' 
          }}>
            Kios Pelanggan
          </h1>
          <p style={{ fontSize: 'var(--fs-400)', opacity: '0.8', margin: 0 }}>
            Pilih layanan dan bergabung ke antrian
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
            <h2 style={{ fontSize: 'var(--fs-600)', fontWeight: '600', marginBottom: 'var(--space-4)' }}>
              Pilih Layanan
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
                    e.currentTarget.style.borderColor = 'var(--clr-primary)'
                    e.currentTarget.style.background = 'color-mix(in oklab, var(--clr-primary) 5%, var(--clr-bg))'
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.borderColor = 'var(--clr-border)'
                    e.currentTarget.style.background = 'var(--clr-bg)'
                  }}
                >
                  <div style={{ fontWeight: '600', fontSize: 'var(--fs-500)', marginBottom: 'var(--space-1)' }}>
                    {service.name}
                  </div>
                  <div style={{ fontSize: 'var(--fs-300)', opacity: '0.7' }}>
                    Kode: {service.code_prefix}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="surface" style={{ padding: 'var(--space-6)' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
              <h2 style={{ fontSize: 'var(--fs-600)', fontWeight: '600', margin: 0 }}>
                Data Pelanggan
              </h2>
              <button onClick={() => setSelectedService(null)} className="btn btn--ghost btn--sm">
                Ubah Layanan
              </button>
            </div>

            <div className="surface" style={{ 
              marginBottom: 'var(--space-4)', 
              padding: 'var(--space-3)', 
              background: 'color-mix(in oklab, var(--clr-primary) 10%, var(--clr-bg))',
              border: '1px solid color-mix(in oklab, var(--clr-primary) 20%, transparent)'
            }}>
              <div style={{ fontWeight: '600', color: 'var(--clr-primary)', marginBottom: 'var(--space-1)' }}>
                Layanan Terpilih
              </div>
              <div style={{ color: 'var(--clr-primary)', fontSize: 'var(--fs-500)' }}>
                {selectedService.name}
              </div>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 'var(--space-4)' }}>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--fs-400)', fontWeight: '600', marginBottom: 'var(--space-2)' }}>
                  Nomor Telepon *
                </label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  onKeyDown={phoneKeyGuard}
                  className="input"
                  style={{ fontSize: 'var(--fs-400)', minHeight: '3rem' }}
                  placeholder="08xxxxxxxxxx"
                  inputMode="numeric"
                  maxLength={12}
                  aria-invalid={!!phoneError}
                  aria-describedby="phone-error"
                  required
                />
                {phoneError && (
                  <div id="phone-error" style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>
                    {phoneError}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--fs-400)', fontWeight: '600', marginBottom: 'var(--space-2)' }}>
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleBasicChange}
                  className="input"
                  style={{ fontSize: 'var(--fs-400)', minHeight: '3rem' }}
                  placeholder="Nama lengkap Anda"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--fs-400)', fontWeight: '600', marginBottom: 'var(--space-2)' }}>
                  Email (Opsional)
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleEmailChange}
                  className="input"
                  style={{ fontSize: 'var(--fs-400)', minHeight: '3rem' }}
                  placeholder="nama@domain.com (opsional)"
                  aria-invalid={!!emailError}
                  aria-describedby="email-error"
                />
                {emailError && (
                  <div id="email-error" style={{ color: '#b91c1c', fontSize: 12, marginTop: 6 }}>
                    {emailError}
                  </div>
                )}
              </div>

              <div>
                <label style={{ display: 'block', fontSize: 'var(--fs-400)', fontWeight: '600', marginBottom: 'var(--space-2)' }}>
                  Catatan
                </label>
                <textarea
                  name="notes"
                  value={formData.notes}
                  onChange={handleBasicChange}
                  rows={3}
                  className="textarea"
                  style={{ fontSize: 'var(--fs-400)', minHeight: '4rem' }}
                  placeholder="Catatan tambahan atau kebutuhan khusus"
                />
              </div>

              <div className="flex gap-3" style={{ marginTop: 'var(--space-2)' }}>
                <button
                  type="button"
                  onClick={() => setSelectedService(null)}
                  className="btn btn--outline btn--lg"
                  style={{ flex: 1, minHeight: '3.5rem', fontSize: 'var(--fs-400)' }}
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="btn btn--primary btn--lg"
                  style={{ flex: 1, minHeight: '3.5rem', fontSize: 'var(--fs-400)', fontWeight: '600' }}
                >
                  {loading ? 'Membuat Nomor…' : 'Ambil Nomor Antrian'}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
