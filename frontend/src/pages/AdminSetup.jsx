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

        return { name, codePrefix, isActive, slaWarnMinutes }
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

        return { name, codePrefix, isActive, slaWarnMinutes }
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
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Admin Setup</h1>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {(error || success) && (
          <div className={`mb-6 px-4 py-3 rounded-lg ${
            error ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-green-50 border border-green-200 text-green-700'
          }`}>
            {error || success}
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab.label}
                  {tab.count !== undefined && (
                    <span className="ml-2 py-0.5 px-2 rounded-full text-xs bg-gray-100 text-gray-600">
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Services</h2>
              <button
                onClick={handleCreateService}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Service
              </button>
            </div>

            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Code Prefix
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SLA Warning
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {services.map(service => (
                    <tr key={service.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {service.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {service.code_prefix}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {service.sla_warn_minutes} minutes
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          service.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {service.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditService(service)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteService(service.id)}
                          className="text-red-600 hover:text-red-900"
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
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">Counters</h2>
              <button
                onClick={handleCreateCounter}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
              >
                Add Counter
              </button>
            </div>

            <div className="bg-white shadow-sm rounded-lg overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Allowed Services
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {counters.map(counter => (
                    <tr key={counter.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {counter.name}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {counter.allowed_service_ids?.length || 0} services
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${
                          counter.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {counter.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => handleEditCounter(counter)}
                          className="text-blue-600 hover:text-blue-900 mr-4"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteCounter(counter.id)}
                          className="text-red-600 hover:text-red-900"
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
            <h2 className="text-xl font-semibold mb-6">System Settings</h2>

            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Hours Start (HH:MM)
                  </label>
                  <input
                    type="time"
                    value={settings.business_hours_start || '09:00'}
                    onChange={(e) => handleSettingChange('business_hours_start', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Hours End (HH:MM)
                  </label>
                  <input
                    type="time"
                    value={settings.business_hours_end || '17:00'}
                    onChange={(e) => handleSettingChange('business_hours_end', e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default SLA Warning (minutes)
                  </label>
                  <input
                    type="number"
                    value={settings.default_sla_warn_minutes || 30}
                    onChange={(e) => handleSettingChange('default_sla_warn_minutes', parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Queue Display Refresh Interval (seconds)
                  </label>
                  <input
                    type="number"
                    value={settings.queue_refresh_interval || 30}
                    onChange={(e) => handleSettingChange('queue_refresh_interval', parseInt(e.target.value))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="5"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>


    </div>
  )
}
