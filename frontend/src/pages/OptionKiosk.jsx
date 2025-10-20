import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import './OptionsKiosk.css'

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
    <div className="kiosk-page">
      <div className="kiosk-container">
        <div className="kiosk-header">
          <h1>Daftar Antrian</h1>
          <p>Silakan pilih area, grup antrian, dan layanan yang Anda inginkan.</p>
        </div>

        {error && (
          <div className="kiosk-error">
            {error}
          </div>
        )}

        <div className="kiosk-content">
          {step !== 'building' && (
            <button onClick={handleBack} className="kiosk-back-button">
              ← Kembali
            </button>
          )}

          {step === 'building' && (
            <>
              <h2>Education Consultant</h2>
              <div className="kiosk-options-grid">
                {buildings.map(building => (
                  <button
                    key={building.id}
                    onClick={() => handleBuildingSelect(building)}
                    className="kiosk-option-button"
                  >
                    <div className="option-name">{building.name}</div>
                    <div className="option-code">Kode: {building.code}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'queueGroup' && (
            <>
              <h2>Pilih Grup Antrian</h2>
              <div className="kiosk-options-grid">
                {queueGroups.map(queueGroup => (
                  <button
                    key={queueGroup.id}
                    onClick={() => handleQueueGroupSelect(queueGroup)}
                    className="kiosk-option-button"
                  >
                    <div className="option-name">{queueGroup.name}</div>
                    <div className="option-code">Kode: {queueGroup.code}</div>
                  </button>
                ))}
              </div>
            </>
          )}

          {step === 'service' && (
            <>
              <h2>Pilih Layanan</h2>
              <div className="kiosk-options-grid">
                {services.map(service => (
                  <button
                    key={service.id}
                    onClick={() => handleServiceSelect(service)}
                    className="kiosk-option-button"
                  >
                    <div className="option-name">{service.name}</div>
                    <div className="option-code">Kode: {service.code_prefix}</div>
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
