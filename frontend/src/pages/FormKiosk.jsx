import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api'
import Swal from 'sweetalert2'
import './OptionsKiosk.css'

export default function FormKiosk() {
  const location = useLocation()
  const navigate = useNavigate()
  const { selectedBuilding, selectedQueueGroup, selectedService } = location.state || {}

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    notes: ''
  })
  const [phoneError, setPhoneError] = useState('')
  const [emailError, setEmailError] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

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
      setError('Layanan tidak dipilih')
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
      navigate('/kiosk/queue', { state: { ticket: result.ticket } })
    } catch (err) {
      if (err.message && err.message.startsWith('cannot create queue ticket')) {
        await Swal.fire({
          icon: 'warning',
          title: 'Outside Business Hours',
          text: err.message,
        })
      } else {
        setError(err.message || 'Gagal membuat nomor antrian')
      }
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedService) {
    return (
      <div className="kiosk-page" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <div>Layanan tidak dipilih. Kembali ke <button
          onClick={() => navigate('/kiosk')}>pilihan layanan</button></div>
      </div>
    )
  }

  return (
    <div className="kiosk-page">
      <div className="kiosk-container">
        <div className="kiosk-header">
          <h1>📝 Data Pelanggan</h1>
          <p>Lengkapi data untuk mendapat nomor antrian</p>
        </div>

        {error && (
          <div className="kiosk-error">
            {error}
          </div>
        )}

        <div className="kiosk-content">
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            flexWrap: 'wrap',
            gap: '0.75rem'
          }}>
            <h2 style={{ margin: 0 }}>Isi Data</h2>
            <button
              onClick={() => navigate('/kiosk')}
              className="kiosk-back-button"
              style={{ marginBottom: 0 }}
            >
              ← Ubah Layanan
            </button>
          </div>

          <div style={{
            marginBottom: '1.25rem',
            padding: '1rem',
            fontSize: '0.9rem',
            color: '#f7b917',
            fontWeight: '600',
            backgroundColor: 'rgba(247, 185, 23, 0.1)',
            border: '1px solid rgba(247, 185, 23, 0.3)',
            borderRadius: '10px'
          }}>
            {selectedBuilding && (
              <div style={{ marginBottom: '0.25rem', opacity: 0.9 }}>
                📍 {selectedBuilding.name}
              </div>
            )}
            {selectedQueueGroup && (
              <div style={{ marginBottom: '0.25rem', opacity: 0.9 }}>
                📋 {selectedQueueGroup.name}
              </div>
            )}
            <div style={{ fontSize: '1rem' }}>
              🎯 {selectedService.name}
            </div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: 'rgba(203, 226, 240, 0.9)' }}>
                Nomor Telepon *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handlePhoneChange}
                onKeyDown={phoneKeyGuard}
                placeholder="08xxxxxxxxxx"
                inputMode="numeric"
                maxLength={12}
                aria-invalid={!!phoneError}
                aria-describedby="phone-error"
                required
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: phoneError ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              {phoneError && (
                <div id="phone-error" style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  {phoneError}
                </div>
              )}
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem', color: 'rgba(203, 226, 240, 0.9)' }}>
                Nama Lengkap *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleBasicChange}
                placeholder="Nama lengkap Anda"
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  fontSize: '1rem',
                  backgroundColor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  borderRadius: '8px',
                  color: '#ffffff',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>

            <div style={{ display: 'none' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Email (tidak wajib)
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleEmailChange}
                placeholder="nama@domain.com (opsional)"
                aria-invalid={!!emailError}
                aria-describedby="email-error"
              />
              {emailError && (
                <div id="email-error" style={{ color: '#fca5a5', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                  {emailError}
                </div>
              )}
            </div>

            <div style={{ display: 'none' }}>
              <label style={{ display: 'block', fontSize: '0.9rem', fontWeight: '600', marginBottom: '0.5rem' }}>
                Catatan (tidak wajib)
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleBasicChange}
                rows={3}
                placeholder="Catatan tambahan atau kebutuhan khusus"
              />
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="button"
                onClick={() => navigate('/kiosk')}
                className="kiosk-back-button"
                style={{
                  flex: 1,
                  marginBottom: 0,
                  padding: '1rem',
                  justifyContent: 'center'
                }}
              >
                ← Kembali
              </button>
              <button
                type="submit"
                disabled={loading}
                style={{
                  flex: 1,
                  padding: '1rem',
                  backgroundColor: '#f7b917',
                  border: 'none',
                  borderRadius: '8px',
                  color: '#143258',
                  fontSize: '1rem',
                  fontWeight: '700',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.7 : 1,
                  transition: 'all 0.3s ease'
                }}
              >
                {loading ? 'Membuat Nomor…' : '🎫 Ambil Nomor'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
