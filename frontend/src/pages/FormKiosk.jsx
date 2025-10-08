import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { api } from '../api'
import Swal from 'sweetalert2'

export default function FormKiosk() {
  const location = useLocation()
  const navigate = useNavigate()
  const selectedService = location.state?.selectedService

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
      setError(err.message || 'Gagal membuat nomor antrian')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (!selectedService) {
    return (
      <div className="page safe" style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--space-4)'
      }}>
        <div>Layanan tidak dipilih. Kembali ke <button onClick={() => navigate('/kiosk')}>pilihan layanan</button></div>
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
            Isi data pelanggan
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

        <div className="surface" style={{ padding: 'var(--space-6)' }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
            <h2 style={{ fontSize: 'var(--fs-600)', fontWeight: '600', margin: 0 }}>
              Data Pelanggan
            </h2>
            <button onClick={() => navigate('/kiosk')} className="btn btn--ghost btn--sm">
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
                onClick={() => navigate('/kiosk')}
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
      </div>
    </div>
  )
}
