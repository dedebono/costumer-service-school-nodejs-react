import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function OptionKiosk() {
  const [step, setStep] = useState('building') // 'building', 'queueGroup', 'service'
  const [buildings, setBuildings] = useState([])
  const [queueGroups, setQueueGroups] = useState([])
  const [services, setServices] = useState([])
  const [selectedBuilding, setSelectedBuilding] = useState(null)
  const [selectedQueueGroup, setSelectedQueueGroup] = useState(null)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (step === 'building') {
      loadBuildings()
    }
  }, [step])

  const loadBuildings = async () => {
    try {
      const data = await api.kiosk.getBuildings()
      setBuildings(data)
    } catch (err) {
      setError('Gagal memuat gedung')
      console.error(err)
    }
  }

  const loadQueueGroups = async (buildingId) => {
    try {
      const data = await api.kiosk.getQueueGroups(buildingId)
      setQueueGroups(data)
    } catch (err) {
      setError('Gagal memuat grup antrian')
      console.error(err)
    }
  }

  const loadServices = async (queueGroupId) => {
    try {
      const data = await api.kiosk.getServices(queueGroupId)
      setServices(data)
    } catch (err) {
      setError('Gagal memuat layanan')
      console.error(err)
    }
  }

  const handleBuildingSelect = (building) => {
    setSelectedBuilding(building)
    setStep('queueGroup')
    loadQueueGroups(building.id)
  }

  const handleQueueGroupSelect = (queueGroup) => {
    setSelectedQueueGroup(queueGroup)
    setStep('service')
    loadServices(queueGroup.id)
  }

  const handleServiceSelect = (service) => {
    navigate('/kiosk/form', {
      state: {
        selectedBuilding,
        selectedQueueGroup,
        selectedService: service
      }
    })
  }

  const handleBack = () => {
    if (step === 'queueGroup') {
      setStep('building')
      setSelectedBuilding(null)
    } else if (step === 'service') {
      setStep('queueGroup')
      setSelectedQueueGroup(null)
    }
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
          {step !== 'building' && (
            <button
              onClick={handleBack}
              style={{
                marginBottom: 'var(--space-4)',
                padding: 'var(--space-3) var(--space-4)',
                background: 'var(--clr-bg)',
                border: '1px solid var(--clr-border)',
                borderRadius: 'var(--radius-2)',
                cursor: 'pointer',
                fontSize: 'var(--fs-400)'
              }}
            >
              ← Kembali
            </button>
          )}

          {step === 'building' && (
            <>
              <h2 style={{ fontSize: 'var(--fs-600)', fontWeight: '600', marginBottom: 'var(--space-4)' }}>
                Pilih Gedung
              </h2>
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {buildings.map(building => (
                  <button
                    key={building.id}
                    onClick={() => handleBuildingSelect(building)}
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
                      {building.name}
                    </div>
                    <div style={{ fontSize: 'var(--fs-300)', opacity: '0.7' }}>
                      Kode: {building.code}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'queueGroup' && (
            <>
              <h2 style={{ fontSize: 'var(--fs-600)', fontWeight: '600', marginBottom: 'var(--space-4)' }}>
                Pilih Grup Antrian
              </h2>
              <div style={{ display: 'grid', gap: 'var(--space-3)' }}>
                {queueGroups.map(queueGroup => (
                  <button
                    key={queueGroup.id}
                    onClick={() => handleQueueGroupSelect(queueGroup)}
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
                      {queueGroup.name}
                    </div>
                    <div style={{ fontSize: 'var(--fs-300)', opacity: '0.7' }}>
                      Kode: {queueGroup.code}
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'service' && (
            <>
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
            </>
          )}
        </div>
      </div>
    </div>
  )
}
