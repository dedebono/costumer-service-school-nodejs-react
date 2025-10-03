import { useState, useEffect } from 'react'
import { api } from '../api'
import Swal from 'sweetalert2'

export default function AdminSetup() {
  const [activeTab, setActiveTab] = useState('services')
  const [services, setServices] = useState([])
  const [counters, setCounters] = useState([])
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')



  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [servicesData, countersData, settingsData] = await Promise.all([
        api.services.getAll(false),
        api.counters.getAll(false),
        api.admin.getSettings()
      ])
      setServices(servicesData)
      setCounters(countersData)
      setSettings(settingsData)
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    }
  }

  const showMessage = (message, isError = false) => {
    if (isError) {
      setError(message)
      setSuccess('')
    } else {
      setSuccess(message)
      setError('')
    }
    setTimeout(() => {
      setError('')
      setSuccess('')
    }, 3000)
  }

  // Service handlers
  const handleCreateService = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Add New Service',
      html: `
        <div style="text-align: left;">
          <label for="service-name" style="display: block; margin-bottom: 8px; font-weight: bold;">Service Name *</label>
          <input id="service-name" type="text" placeholder="e.g., General Banking" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">

          <label for="service-code" style="display: block; margin-bottom: 8px; font-weight: bold;">Code Prefix *</label>
          <input id="service-code" type="text" placeholder="e.g., GEN" maxlength="3" style="width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; text-transform: uppercase;">
          <p style="font-size: 12px; color: #666; margin-bottom: 16px;">3-letter code for ticket numbering</p>

          <label for="service-sla" style="display: block; margin-bottom: 8px; font-weight: bold;">SLA Warning (minutes)</label>
          <input id="service-sla" type="number" min="1" value="30" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">

          <label for="service-connection" style="display: block; margin-bottom: 8px; font-weight: bold;">Connection Type</label>
          <select id="service-connection" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
            <option value="none" selected>None</option>
            <option value="admission">Admission</option>
            <option value="ticket">Ticket</option>
          </select>

          <label style="display: flex; align-items: center;">
            <input type="checkbox" id="service-active" checked style="margin-right: 8px;">
            Active
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Create Service',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const name = document.getElementById('service-name').value.trim()
        const codePrefix = document.getElementById('service-code').value.trim().toUpperCase()
        const slaWarnMinutes = parseInt(document.getElementById('service-sla').value) || 30
        const connectionType = document.getElementById('service-connection').value
        const isActive = document.getElementById('service-active').checked

        if (!name) {
          Swal.showValidationMessage('Service name is required')
          return false
        }
        if (!codePrefix) {
          Swal.showValidationMessage('Code prefix is required')
          return false
        }
        if (codePrefix.length !== 3) {
          Swal.showValidationMessage('Code prefix must be exactly 3 characters')
          return false
        }

        return { name, codePrefix, isActive, slaWarnMinutes, connectionType }
      }
    })

    if (formValues) {
      try {
        await api.services.create(formValues)
        Swal.fire({
          icon: 'success',
          title: 'Service created successfully',
          text: 'The service has been added.',
        })
        await loadData()
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Failed to create service',
          text: err.message || 'An error occurred while creating the service.',
        })
      }
    }
  }

  const handleEditService = async (service) => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Service',
      html: `
        <div style="text-align: left;">
          <label for="service-name" style="display: block; margin-bottom: 8px; font-weight: bold;">Service Name *</label>
          <input id="service-name" type="text" value="${service.name}" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">

          <label for="service-code" style="display: block; margin-bottom: 8px; font-weight: bold;">Code Prefix *</label>
          <input id="service-code" type="text" value="${service.code_prefix}" maxlength="3" style="width: 100%; padding: 8px; margin-bottom: 8px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; text-transform: uppercase;">
          <p style="font-size: 12px; color: #666; margin-bottom: 16px;">3-letter code for ticket numbering</p>

          <label for="service-sla" style="display: block; margin-bottom: 8px; font-weight: bold;">SLA Warning (minutes)</label>
          <input id="service-sla" type="number" min="1" value="${service.sla_warn_minutes || 30}" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">

          <label for="service-connection" style="display: block; margin-bottom: 8px; font-weight: bold;">Connection Type</label>
          <select id="service-connection" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
            <option value="none" ${service.connection_type === 'none' ? 'selected' : ''}>None</option>
            <option value="admission" ${service.connection_type === 'admission' ? 'selected' : ''}>Admission</option>
            <option value="ticket" ${service.connection_type === 'ticket' ? 'selected' : ''}>Ticket</option>
          </select>

          <label style="display: flex; align-items: center;">
            <input type="checkbox" id="service-active" ${service.is_active ? 'checked' : ''} style="margin-right: 8px;">
            Active
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Update Service',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const name = document.getElementById('service-name').value.trim()
        const codePrefix = document.getElementById('service-code').value.trim().toUpperCase()
        const slaWarnMinutes = parseInt(document.getElementById('service-sla').value) || 30
        const connectionType = document.getElementById('service-connection').value
        const isActive = document.getElementById('service-active').checked

        if (!name) {
          Swal.showValidationMessage('Service name is required')
          return false
        }
        if (!codePrefix) {
          Swal.showValidationMessage('Code prefix is required')
          return false
        }
        if (codePrefix.length !== 3) {
          Swal.showValidationMessage('Code prefix must be exactly 3 characters')
          return false
        }

        return { name, codePrefix, isActive, slaWarnMinutes, connectionType }
      }
    })

    if (formValues) {
      try {
        await api.services.update(service.id, formValues)
        Swal.fire({
          icon: 'success',
          title: 'Service updated successfully',
          text: 'The service has been updated.',
        })
        await loadData()
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Failed to update service',
          text: err.message || 'An error occurred while updating the service.',
        })
      }
    }
  }



  const handleDeleteService = async (serviceId) => {
    const result = await Swal.fire({
      title: 'Delete Service',
      text: 'Are you sure you want to delete this service? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        await api.services.delete(serviceId)
        Swal.fire({
          icon: 'success',
          title: 'Service deleted successfully',
          text: 'The service has been removed.',
        })
        await loadData()
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Failed to delete service',
          text: err.message || 'An error occurred while deleting the service.',
        })
      }
    }
  }

  // Counter handlers
  const handleCreateCounter = async () => {
    const servicesHtml = services.map(service => `
      <label style="display: block; margin-bottom: 5px;">
        <input type="checkbox" id="service-${service.id}" value="${service.id}" style="margin-right: 8px;">
        ${service.name} (${service.code_prefix})
      </label>
    `).join('')

    const { value: formValues } = await Swal.fire({
      title: 'Add New Counter',
      html: `
        <div style="text-align: left;">
          <label for="counter-name" style="display: block; margin-bottom: 8px; font-weight: bold;">Counter Name *</label>
          <input id="counter-name" type="text" placeholder="e.g., Counter 1" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">

          <label style="display: block; margin-bottom: 8px; font-weight: bold;">Allowed Services</label>
          <div style="max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 8px; margin-bottom: 16px; border-radius: 4px;">
            ${servicesHtml}
          </div>

          <label style="display: flex; align-items: center;">
            <input type="checkbox" id="counter-active" checked style="margin-right: 8px;">
            Active
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Create Counter',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const name = document.getElementById('counter-name').value.trim()
        if (!name) {
          Swal.showValidationMessage('Counter name is required')
          return false
        }
        const allowedServiceIds = services
          .filter(service => document.getElementById(`service-${service.id}`).checked)
          .map(service => service.id)
        const isActive = document.getElementById('counter-active').checked
        return { name, allowedServiceIds, isActive }
      }
    })

    if (formValues) {
      try {
        await api.counters.create(formValues)
        Swal.fire({
          icon: 'success',
          title: 'Counter created successfully',
          text: 'The counter has been added.',
        })
        await loadData()
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Failed to create counter',
          text: err.message || 'An error occurred while creating the counter.',
        })
      }
    }
  }

  const handleEditCounter = async (counter) => {
    const servicesHtml = services.map(service => {
      const isChecked = (counter.allowed_service_ids || []).includes(service.id) ? 'checked' : ''
      return `
        <label style="display: block; margin-bottom: 5px;">
          <input type="checkbox" id="service-${service.id}" value="${service.id}" ${isChecked} style="margin-right: 8px;">
          ${service.name} (${service.code_prefix})
        </label>
      `
    }).join('')

    const { value: formValues } = await Swal.fire({
      title: 'Edit Counter',
      html: `
        <div style="text-align: left;">
          <label for="counter-name" style="display: block; margin-bottom: 8px; font-weight: bold;">Counter Name *</label>
          <input id="counter-name" type="text" value="${counter.name}" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">

          <label style="display: block; margin-bottom: 8px; font-weight: bold;">Allowed Services</label>
          <div style="max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 8px; margin-bottom: 16px; border-radius: 4px;">
            ${servicesHtml}
          </div>

          <label style="display: flex; align-items: center;">
            <input type="checkbox" id="counter-active" ${counter.is_active ? 'checked' : ''} style="margin-right: 8px;">
            Active
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Update Counter',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const name = document.getElementById('counter-name').value.trim()
        if (!name) {
          Swal.showValidationMessage('Counter name is required')
          return false
        }
        const allowedServiceIds = services
          .filter(service => document.getElementById(`service-${service.id}`).checked)
          .map(service => service.id)
        const isActive = document.getElementById('counter-active').checked
        return { name, allowedServiceIds, isActive }
      }
    })

    if (formValues) {
      try {
        await api.counters.update(counter.id, formValues)
        Swal.fire({
          icon: 'success',
          title: 'Counter updated successfully',
          text: 'The counter has been updated.',
        })
        await loadData()
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Failed to update counter',
          text: err.message || 'An error occurred while updating the counter.',
        })
      }
    }
  }



  const handleDeleteCounter = async (counterId) => {
    const result = await Swal.fire({
      title: 'Delete Counter',
      text: 'Are you sure you want to delete this counter? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        await api.counters.delete(counterId)
        Swal.fire({
          icon: 'success',
          title: 'Counter deleted successfully',
          text: 'The counter has been removed.',
        })
        await loadData()
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Failed to delete counter',
          text: err.message || 'An error occurred while deleting the counter.',
        })
      }
    }
  }



  // Settings handlers
  const handleSettingChange = async (key, value) => {
    try {
      await api.admin.setSetting(key, value)
      setSettings({ ...settings, [key]: value })
      showMessage('Setting updated successfully')
    } catch (err) {
      showMessage(err.message || 'Failed to update setting', true)
    }
  }

  const tabs = [
    { id: 'services', label: 'Services', count: services.length },
    { id: 'counters', label: 'Counters', count: counters.length },
    { id: 'settings', label: 'Settings' }
  ]

  return (
    <div className="page">
      <div className="w-full">
        <header className="surface" style={{ borderRadius: 0, borderBottom: '1px solid var(--clr-border)' }}>
          <div className="container">
            <div className="flex items-center justify-between" style={{ padding: 'var(--space-4) 0' }}>
              <h1 style={{ fontSize: 'var(--fs-700)', fontWeight: '700', margin: 0 }}>Admin Setup</h1>
            </div>
          </div>
        </header>

        <main className="container" style={{ paddingTop: 'var(--space-6)', paddingBottom: 'var(--space-6)' }}>
          {(error || success) && (
            <div className="surface" style={{ 
              background: error ? 'color-mix(in oklab, red 10%, var(--clr-bg))' : 'color-mix(in oklab, green 10%, var(--clr-bg))', 
              border: error ? '1px solid color-mix(in oklab, red 30%, transparent)' : '1px solid color-mix(in oklab, green 30%, transparent)',
              color: error ? 'color-mix(in oklab, red 80%, black)' : 'color-mix(in oklab, green 80%, black)',
              padding: 'var(--space-4)',
              marginBottom: 'var(--space-6)'
            }}>
              {error || success}
            </div>
          )}

          {/* Tabs */}
          <div style={{ marginBottom: 'var(--space-6)' }}>
            <div style={{ borderBottom: '1px solid var(--clr-border)' }}>
              <nav className="flex gap-8" style={{ marginBottom: '-1px' }}>
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="btn btn--ghost"
                    style={{
                      padding: 'var(--space-2) var(--space-1)',
                      borderBottom: activeTab === tab.id ? '2px solid var(--clr-primary)' : '2px solid transparent',
                      borderRadius: 0,
                      fontWeight: '600',
                      fontSize: 'var(--fs-300)',
                      color: activeTab === tab.id ? 'var(--clr-primary)' : 'var(--clr-text)',
                      background: 'transparent'
                    }}
                  >
                    {tab.label}
                    {tab.count !== undefined && (
                      <span className="badge" style={{ marginLeft: 'var(--space-2)' }}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Services Tab */}
          {activeTab === 'services' && (
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
                <h2 style={{ fontSize: 'var(--fs-600)', fontWeight: '600', margin: 0 }}>Services</h2>
                <button
                  onClick={handleCreateService}
                  className="btn btn--primary"
                >
                  Add Service
                </button>
              </div>

              <div className="surface" style={{ overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Code Prefix</th>
                      <th>SLA Warning</th>
                      <th>Connection Type</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {services.map(service => (
                      <tr key={service.id}>
                        <td style={{ fontWeight: '600' }}>
                          {service.name}
                        </td>
                        <td>
                          {service.code_prefix}
                        </td>
                        <td>
                          {service.sla_warn_minutes} minutes
                        </td>
                        <td>
                          {service.connection_type === 'none' ? 'None' : 
                           service.connection_type === 'admission' ? 'Admission' : 
                           service.connection_type === 'ticket' ? 'Ticket' : 'None'}
                        </td>
                        <td>
                          <span className={service.is_active ? 'badge tag-primary' : 'badge'}>
                            {service.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleEditService(service)}
                            className="btn btn--ghost btn--sm"
                            style={{ marginRight: 'var(--space-2)' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteService(service.id)}
                            className="btn btn--outline btn--sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Counters Tab */}
          {activeTab === 'counters' && (
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
                <h2 style={{ fontSize: 'var(--fs-600)', fontWeight: '600', margin: 0 }}>Counters</h2>
                <button
                  onClick={handleCreateCounter}
                  className="btn btn--primary"
                >
                  Add Counter
                </button>
              </div>

              <div className="surface" style={{ overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Allowed Services</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {counters.map(counter => (
                      <tr key={counter.id}>
                        <td style={{ fontWeight: '600' }}>
                          {counter.name}
                        </td>
                        <td>
                          {counter.allowed_service_ids?.length || 0} services
                        </td>
                        <td>
                          <span className={counter.is_active ? 'badge tag-primary' : 'badge'}>
                            {counter.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleEditCounter(counter)}
                            className="btn btn--ghost btn--sm"
                            style={{ marginRight: 'var(--space-2)' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCounter(counter.id)}
                            className="btn btn--outline btn--sm"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div>
              <h2 style={{ fontSize: 'var(--fs-600)', fontWeight: '600', marginBottom: 'var(--space-6)' }}>
                System Settings
              </h2>

              <div className="surface p-6">
                <div style={{ display: 'grid', gap: 'var(--space-6)' }}>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: 'var(--fs-300)', 
                      fontWeight: '600', 
                      marginBottom: 'var(--space-2)' 
                    }}>
                      Business Hours Start (HH:MM)
                    </label>
                    <input
                      type="time"
                      value={settings.business_hours_start || '09:00'}
                      onChange={(e) => handleSettingChange('business_hours_start', e.target.value)}
                      className="input"
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: 'var(--fs-300)', 
                      fontWeight: '600', 
                      marginBottom: 'var(--space-2)' 
                    }}>
                      Business Hours End (HH:MM)
                    </label>
                    <input
                      type="time"
                      value={settings.business_hours_end || '17:00'}
                      onChange={(e) => handleSettingChange('business_hours_end', e.target.value)}
                      className="input"
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: 'var(--fs-300)', 
                      fontWeight: '600', 
                      marginBottom: 'var(--space-2)' 
                    }}>
                      Default SLA Warning (minutes)
                    </label>
                    <input
                      type="number"
                      value={settings.default_sla_warn_minutes || 30}
                      onChange={(e) => handleSettingChange('default_sla_warn_minutes', parseInt(e.target.value))}
                      className="input"
                      min="1"
                    />
                  </div>

                  <div>
                    <label style={{ 
                      display: 'block', 
                      fontSize: 'var(--fs-300)', 
                      fontWeight: '600', 
                      marginBottom: 'var(--space-2)' 
                    }}>
                      Queue Display Refresh Interval (seconds)
                    </label>
                    <input
                      type="number"
                      value={settings.queue_refresh_interval || 30}
                      onChange={(e) => handleSettingChange('queue_refresh_interval', parseInt(e.target.value))}
                      className="input"
                      min="5"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
