import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function OptionKiosk() {
  const [services, setServices] = useState([])
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadServices()
  }, [])

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
    navigate('/kiosk/form', { state: { selectedService: service } })
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
      </div>
    </div>
  )
}
