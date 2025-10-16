import { useState, useEffect, useMemo } from 'react'
import { api } from '../api'
import Swal from 'sweetalert2'
import moment from 'moment-timezone'

/** Helpers for HH:mm conversions */
const toUTCClock = (hhmm, tz) =>
  moment.tz(`2000-01-01 ${hhmm}`, tz).utc().format('HH:mm')

const fromUTCClock = (hhmmUTC, tz) =>
  moment.utc(`2000-01-01 ${hhmmUTC}`).tz(tz).format('HH:mm')

export default function AdminSetup() {
  const [activeTab, setActiveTab] = useState('services')
  const [services, setServices] = useState([])
  const [counters, setCounters] = useState([])
  const [buildings, setBuildings] = useState([])
  const [queueGroups, setQueueGroups] = useState([])
  const [settings, setSettings] = useState({})
  const [pendingSettings, setPendingSettings] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    try {
      const [
        servicesData,
        countersData,
        buildingsData,
        queueGroupsData,
        settingsData
      ] = await Promise.all([
        api.services.getAll(false),
        api.counters.getAll(false),
        api.buildings.getAll(false),
        api.queueGroups.getAll(false),
        api.admin.getSettings()
      ])

      setServices(servicesData)
      setCounters(countersData)
      setBuildings(buildingsData)
      setQueueGroups(queueGroupsData)

      // Expecting UTC HH:mm stored in backend
      const savedTz = settingsData?.timezone || moment.tz.guess() || 'UTC'
      const savedStartUTC = settingsData?.business_hours_start || '09:00'
      const savedEndUTC = settingsData?.business_hours_end || '17:00'

      setSettings({
        ...settingsData,
        timezone: savedTz,
        business_hours_start: savedStartUTC,
        business_hours_end: savedEndUTC
      })

      // Initialize pending in LOCAL for display/edit
      setPendingSettings({
        timezone: savedTz,
        business_hours_start: fromUTCClock(savedStartUTC, savedTz),
        business_hours_end: fromUTCClock(savedEndUTC, savedTz),
        default_sla_warn_minutes:
          settingsData?.default_sla_warn_minutes ?? 30,
        ticket_number_format:
          settingsData?.ticket_number_format ??
          '{building_code}/{queuegroup_code}/{service_code}/{number}'
      })
    } catch (err) {
      setError('Failed to load data')
      console.error(err)
    } finally {
      setLoading(false)
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

  // Building handlers
  const handleCreateBuilding = async () => {
    const { value: formValues } = await Swal.fire({
      title: 'Add New Building',
      html: `
        <div style="text-align: left;">
          <label for="building-code" style="display: block; margin-bottom: 8px; font-weight: bold;">Code *</label>
          <input id="building-code" type="text" placeholder="e.g., MAIN" maxlength="10" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; text-transform: uppercase;">

          <label for="building-name" style="display: block; margin-bottom: 8px; font-weight: bold;">Name *</label>
          <input id="building-name" type="text" placeholder="e.g., Main Building" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">

          <label for="building-location" style="display: block; margin-bottom: 8px; font-weight: bold;">Location</label>
          <input id="building-location" type="text" placeholder="e.g., Downtown" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">

          <label for="building-description" style="display: block; margin-bottom: 8px; font-weight: bold;">Description</label>
          <textarea id="building-description" placeholder="Optional description" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; resize: vertical;"></textarea>

          <label style="display: flex; align-items: center;">
            <input type="checkbox" id="building-active" checked style="margin-right: 8px;">
            Active
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Create Building',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const code = document.getElementById('building-code').value.trim().toUpperCase()
        const name = document.getElementById('building-name').value.trim()
        const location = document.getElementById('building-location').value.trim()
        const description = document.getElementById('building-description').value.trim()
        const isActive = document.getElementById('building-active').checked

        if (!code) {
          Swal.showValidationMessage('Building code is required')
          return false
        }
        if (!name) {
          Swal.showValidationMessage('Building name is required')
          return false
        }

        return { code, name, location, description, isActive }
      }
    })

    if (formValues) {
      try {
        await api.buildings.create(formValues)
        Swal.fire({
          icon: 'success',
          title: 'Building created successfully',
          text: 'The building has been added.',
        })
        await loadData()
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Failed to create building',
          text: err.message || 'An error occurred while creating the building.',
        })
      }
    }
  }

  const handleEditBuilding = async (building) => {
    const { value: formValues } = await Swal.fire({
      title: 'Edit Building',
      html: `
        <div style="text-align: left;">
          <label for="building-code" style="display: block; margin-bottom: 8px; font-weight: bold;">Code *</label>
          <input id="building-code" type="text" value="${building.code}" maxlength="10" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; text-transform: uppercase;">

          <label for="building-name" style="display: block; margin-bottom: 8px; font-weight: bold;">Name *</label>
          <input id="building-name" type="text" value="${building.name}" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">

          <label for="building-location" style="display: block; margin-bottom: 8px; font-weight: bold;">Location</label>
          <input id="building-location" type="text" value="${building.location || ''}" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">

          <label for="building-description" style="display: block; margin-bottom: 8px; font-weight: bold;">Description</label>
          <textarea id="building-description" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; resize: vertical;">${building.description || ''}</textarea>

          <label style="display: flex; align-items: center;">
            <input type="checkbox" id="building-active" ${building.is_active ? 'checked' : ''} style="margin-right: 8px;">
            Active
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Update Building',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const code = document.getElementById('building-code').value.trim().toUpperCase()
        const name = document.getElementById('building-name').value.trim()
        const location = document.getElementById('building-location').value.trim()
        const description = document.getElementById('building-description').value.trim()
        const isActive = document.getElementById('building-active').checked

        if (!code) {
          Swal.showValidationMessage('Building code is required')
          return false
        }
        if (!name) {
          Swal.showValidationMessage('Building name is required')
          return false
        }

        return { code, name, location, description, isActive }
      }
    })

    if (formValues) {
      try {
        await api.buildings.update(building.id, formValues)
        Swal.fire({
          icon: 'success',
          title: 'Building updated successfully',
          text: 'The building has been updated.',
        })
        await loadData()
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Failed to update building',
          text: err.message || 'An error occurred while updating the building.',
        })
      }
    }
  }

  const handleDeleteBuilding = async (buildingId) => {
    const result = await Swal.fire({
      title: 'Delete Building',
      text: 'Are you sure you want to delete this building? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        await api.buildings.delete(buildingId)
        Swal.fire({
          icon: 'success',
          title: 'Building deleted successfully',
          text: 'The building has been removed.',
        })
        await loadData()
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Failed to delete building',
          text: err.message || 'An error occurred while deleting the building.',
        })
      }
    }
  }

  // Queue Group handlers
  const handleCreateQueueGroup = async () => {
    const buildingsHtml = buildings.map(building => `
      <option value="${building.id}">${building.name} (${building.code})</option>
    `).join('')

    const servicesHtml = services.map(service => `
      <label style="display: block; margin-bottom: 5px;">
        <input type="checkbox" id="service-${service.id}" value="${service.id}" style="margin-right: 8px;">
        ${service.name} (${service.code_prefix})
      </label>
    `).join('')

    const { value: formValues } = await Swal.fire({
      title: 'Add New Queue Group',
      html: `
        <div style="text-align: left;">
          <label for="queue-group-code" style="display: block; margin-bottom: 8px; font-weight: bold;">Code *</label>
          <input id="queue-group-code" type="text" placeholder="e.g., MAIN" maxlength="10" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; text-transform: uppercase;">

          <label for="queue-group-name" style="display: block; margin-bottom: 8px; font-weight: bold;">Name *</label>
          <input id="queue-group-name" type="text" placeholder="e.g., Main Queue" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">

          <label for="queue-group-building" style="display: block; margin-bottom: 8px; font-weight: bold;">Building *</label>
          <select id="queue-group-building" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
            <option value="">Select Building</option>
            ${buildingsHtml}
          </select>

          <label style="display: block; margin-bottom: 8px; font-weight: bold;">Allowed Services</label>
          <div style="max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 8px; margin-bottom: 16px; border-radius: 4px;">
            ${servicesHtml}
          </div>

          <label style="display: flex; align-items: center;">
            <input type="checkbox" id="queue-group-active" checked style="margin-right: 8px;">
            Active
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Create Queue Group',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const code = document.getElementById('queue-group-code').value.trim().toUpperCase()
        const name = document.getElementById('queue-group-name').value.trim()
        const buildingId = parseInt(document.getElementById('queue-group-building').value)
        const isActive = document.getElementById('queue-group-active').checked

        if (!code) {
          Swal.showValidationMessage('Queue group code is required')
          return false
        }
        if (!name) {
          Swal.showValidationMessage('Queue group name is required')
          return false
        }
        if (!buildingId) {
          Swal.showValidationMessage('Building selection is required')
          return false
        }

        const allowedServiceIds = services
          .filter(service => document.getElementById(`service-${service.id}`).checked)
          .map(service => service.id)

        return { code, name, buildingId, allowedServiceIds, isActive }
      }
    })

    if (formValues) {
      try {
        await api.queueGroups.create(formValues)
        Swal.fire({
          icon: 'success',
          title: 'Queue group created successfully',
          text: 'The queue group has been added.',
        })
        await loadData()
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Failed to create queue group',
          text: err.message || 'An error occurred while creating the queue group.',
        })
      }
    }
  }

  const handleEditQueueGroup = async (queueGroup) => {
    const buildingsHtml = buildings.map(building => `
      <option value="${building.id}" ${building.id === queueGroup.building_id ? 'selected' : ''}>${building.name} (${building.code})</option>
    `).join('')

    const servicesHtml = services.map(service => {
      const isChecked = (queueGroup.allowed_service_ids || []).includes(service.id) ? 'checked' : ''
      return `
        <label style="display: block; margin-bottom: 5px;">
          <input type="checkbox" id="service-${service.id}" value="${service.id}" ${isChecked} style="margin-right: 8px;">
          ${service.name} (${service.code_prefix})
        </label>
      `
    }).join('')

    const { value: formValues } = await Swal.fire({
      title: 'Edit Queue Group',
      html: `
        <div style="text-align: left;">
          <label for="queue-group-code" style="display: block; margin-bottom: 8px; font-weight: bold;">Code *</label>
          <input id="queue-group-code" type="text" value="${queueGroup.code}" maxlength="10" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; text-transform: uppercase;">

          <label for="queue-group-name" style="display: block; margin-bottom: 8px; font-weight: bold;">Name *</label>
          <input id="queue-group-name" type="text" value="${queueGroup.name}" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">

          <label for="queue-group-building" style="display: block; margin-bottom: 8px; font-weight: bold;">Building *</label>
          <select id="queue-group-building" style="width: 100%; padding: 8px; margin-bottom: 16px; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box;">
            <option value="">Select Building</option>
            ${buildingsHtml}
          </select>

          <label style="display: block; margin-bottom: 8px; font-weight: bold;">Allowed Services</label>
          <div style="max-height: 150px; overflow-y: auto; border: 1px solid #ccc; padding: 8px; margin-bottom: 16px; border-radius: 4px;">
            ${servicesHtml}
          </div>

          <label style="display: flex; align-items: center;">
            <input type="checkbox" id="queue-group-active" ${queueGroup.is_active ? 'checked' : ''} style="margin-right: 8px;">
            Active
          </label>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Update Queue Group',
      cancelButtonText: 'Cancel',
      preConfirm: () => {
        const code = document.getElementById('queue-group-code').value.trim().toUpperCase()
        const name = document.getElementById('queue-group-name').value.trim()
        const buildingId = parseInt(document.getElementById('queue-group-building').value)
        const isActive = document.getElementById('queue-group-active').checked

        if (!code) {
          Swal.showValidationMessage('Queue group code is required')
          return false
        }
        if (!name) {
          Swal.showValidationMessage('Queue group name is required')
          return false
        }
        if (!buildingId) {
          Swal.showValidationMessage('Building selection is required')
          return false
        }

        const allowedServiceIds = services
          .filter(service => document.getElementById(`service-${service.id}`).checked)
          .map(service => service.id)

        return { code, name, buildingId, allowedServiceIds, isActive }
      }
    })

    if (formValues) {
      try {
        await api.queueGroups.update(queueGroup.id, formValues)
        Swal.fire({
          icon: 'success',
          title: 'Queue group updated successfully',
          text: 'The queue group has been updated.',
        })
        await loadData()
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Failed to update queue group',
          text: err.message || 'An error occurred while updating the queue group.',
        })
      }
    }
  }

  const handleDeleteQueueGroup = async (queueGroupId) => {
    const result = await Swal.fire({
      title: 'Delete Queue Group',
      text: 'Are you sure you want to delete this queue group? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel'
    })

    if (result.isConfirmed) {
      try {
        await api.queueGroups.delete(queueGroupId)
        Swal.fire({
          icon: 'success',
          title: 'Queue group deleted successfully',
          text: 'The queue group has been removed.',
        })
        await loadData()
      } catch (err) {
        Swal.fire({
          icon: 'error',
          title: 'Failed to delete queue group',
          text: err.message || 'An error occurred while deleting the queue group.',
        })
      }
    }
  }

  // ===== Settings (timezone & business hours) =====

  // Use IANA list for completeness (optional — keep your fixed list if you prefer)
  const allTimezones = useMemo(() => moment.tz.names(), [])

  const effectiveTz =
    pendingSettings.timezone ||
    settings.timezone ||
    moment.tz.guess() ||
    'UTC'

  const handleSettingChange = (key, value) => {
    if (key === 'timezone') {
      // When timezone changes, re-derive LOCAL inputs from saved UTC so form stays consistent
      const newTz = value || 'UTC'
      const startUTC = settings.business_hours_start || '09:00'
      const endUTC = settings.business_hours_end || '17:00'
      setPendingSettings(prev => ({
        ...prev,
        timezone: newTz,
        business_hours_start: fromUTCClock(startUTC, newTz),
        business_hours_end: fromUTCClock(endUTC, newTz)
      }))
      return
    }
    setPendingSettings(prev => ({ ...prev, [key]: value }))
  }

  const handleSaveSettings = async () => {
    try {
      const tz = pendingSettings.timezone || settings.timezone || 'UTC'
      const processedSettings = { ...pendingSettings }

      // Convert local HH:mm to UTC HH:mm
      if (pendingSettings.business_hours_start) {
        processedSettings.business_hours_start = toUTCClock(
          pendingSettings.business_hours_start,
          tz
        )
      }
      if (pendingSettings.business_hours_end) {
        processedSettings.business_hours_end = toUTCClock(
          pendingSettings.business_hours_end,
          tz
        )
      }

      // Persist each changed key
      const promises = Object.entries(processedSettings).map(([key, value]) =>
        api.admin.setSetting(key, value)
      )
      await Promise.all(promises)

      // Update canonical settings (UTC) and reflect back to local display
      const savedStartUTC =
        processedSettings.business_hours_start ??
        settings.business_hours_start ??
        '09:00'
      const savedEndUTC =
        processedSettings.business_hours_end ??
        settings.business_hours_end ??
        '17:00'
      const savedTz = processedSettings.timezone ?? settings.timezone ?? 'UTC'

      setSettings(prev => ({
        ...prev,
        ...processedSettings,
        business_hours_start: savedStartUTC,
        business_hours_end: savedEndUTC,
        timezone: savedTz
      }))

      setPendingSettings(prev => ({
        ...prev,
        timezone: savedTz,
        business_hours_start: fromUTCClock(savedStartUTC, savedTz),
        business_hours_end: fromUTCClock(savedEndUTC, savedTz)
      }))

      await Swal.fire({
        icon: 'success',
        title: 'Settings Updated',
        text: 'All settings updated successfully',
        timer: 2000,
        showConfirmButton: false,
      })
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: err.message || 'Failed to update settings',
      })
    }
  }

  // Preview strings
  const previewLocal =
    (pendingSettings.business_hours_start || '') +
    ' – ' +
    (pendingSettings.business_hours_end || '') +
    ' ' +
    (effectiveTz || '')
  const previewUTC =
    (settings.business_hours_start || '') +
    ' – ' +
    (settings.business_hours_end || '') +
    ' UTC'

  const tabs = [
    { id: 'services', label: 'Services', count: services.length },
    { id: 'counters', label: 'Counters', count: counters.length },
    { id: 'buildings', label: 'Buildings', count: buildings.length },
    { id: 'queueGroups', label: 'Queue Groups', count: queueGroups.length },
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

          {/* Buildings Tab */}
          {activeTab === 'buildings' && (
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
                <h2 style={{ fontSize: 'var(--fs-600)', fontWeight: '600', margin: 0 }}>Buildings</h2>
                <button
                  onClick={handleCreateBuilding}
                  className="btn btn--primary"
                >
                  Add Building
                </button>
              </div>

              <div className="surface" style={{ overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Location</th>
                      <th>Description</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {buildings.map(building => (
                      <tr key={building.id}>
                        <td style={{ fontWeight: '600' }}>
                          {building.code}
                        </td>
                        <td>
                          {building.name}
                        </td>
                        <td>
                          {building.location || '-'}
                        </td>
                        <td>
                          {building.description || '-'}
                        </td>
                        <td>
                          <span className={building.is_active ? 'badge tag-primary' : 'badge'}>
                            {building.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            onClick={() => handleEditBuilding(building)}
                            className="btn btn--ghost btn--sm"
                            style={{ marginRight: 'var(--space-2)' }}
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteBuilding(building.id)}
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

          {/* Queue Groups Tab */}
          {activeTab === 'queueGroups' && (
            <div>
              <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-6)' }}>
                <h2 style={{ fontSize: 'var(--fs-600)', fontWeight: '600', margin: 0 }}>Queue Groups</h2>
                <button
                  onClick={handleCreateQueueGroup}
                  className="btn btn--primary"
                >
                  Add Queue Group
                </button>
              </div>

              <div className="surface" style={{ overflow: 'hidden' }}>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Code</th>
                      <th>Name</th>
                      <th>Building</th>
                      <th>Allowed Services</th>
                      <th>Status</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueGroups.map(queueGroup => {
                      const building = buildings.find(b => b.id === queueGroup.building_id)
                      return (
                        <tr key={queueGroup.id}>
                          <td style={{ fontWeight: '600' }}>
                            {queueGroup.code}
                          </td>
                          <td>
                            {queueGroup.name}
                          </td>
                          <td>
                            {building ? `${building.name} (${building.code})` : '-'}
                          </td>
                          <td>
                            {queueGroup.allowed_service_ids?.length || 0} services
                          </td>
                          <td>
                            <span className={queueGroup.is_active ? 'badge tag-primary' : 'badge'}>
                              {queueGroup.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              onClick={() => handleEditQueueGroup(queueGroup)}
                              className="btn btn--ghost btn--sm"
                              style={{ marginRight: 'var(--space-2)' }}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteQueueGroup(queueGroup.id)}
                              className="btn btn--outline btn--sm"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      )
                    })}
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

              <div className="surface p-6" style={{display:'flex', flexDirection:'column', gap:'10px'}}>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gridTemplateRows: 'auto auto auto',
                    gap: 'var(--space-6)',
                    alignItems: 'start',
                    justifyContent: 'start',
                  }}
                >
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: 'var(--fs-300)',
                      fontWeight: '600',
                      marginBottom: 'var(--space-2)'
                    }}>
                      Business Hours Start (Local HH:MM)
                    </label>
                    <input
                      type="time"
                      value={pendingSettings.business_hours_start || ''}
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
                      Business Hours End (Local HH:MM)
                    </label>
                    <input
                      type="time"
                      value={pendingSettings.business_hours_end || ''}
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
                      value={
                        pendingSettings.default_sla_warn_minutes !== undefined
                          ? pendingSettings.default_sla_warn_minutes
                          : (settings.default_sla_warn_minutes || 30)
                      }
                      onChange={(e) => handleSettingChange('default_sla_warn_minutes', parseInt(e.target.value || '0', 10))}
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
                      Queue Ticket Number Format
                    </label>
                    <input
                      type="text"
                      value={
                        pendingSettings.ticket_number_format !== undefined
                          ? pendingSettings.ticket_number_format
                          : (settings.ticket_number_format || '{building_code}/{queuegroup_code}/{service_code}/{number}')
                      }
                      onChange={(e) => handleSettingChange('ticket_number_format', e.target.value)}
                      className="input"
                      placeholder="e.g., {building_code}/{service_code}-{number}"
                    />
                    <p style={{ fontSize: 'var(--fs-200)', color: 'var(--clr-text-muted)', marginTop: 'var(--space-1)' }}>
                      Available placeholders: {'{building_code}'}, {'{queuegroup_code}'}, {'{service_code}'}, {'{number}'}
                    </p>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <label style={{
                      display: 'block',
                      fontSize: 'var(--fs-300)',
                      fontWeight: '600',
                      marginBottom: 'var(--space-2)'
                    }}>
                      Timezone
                    </label>

                    {/* Use IANA list for full coverage */}
                    <select
                      value={pendingSettings.timezone || effectiveTz}
                      onChange={(e) => handleSettingChange('timezone', e.target.value)}
                      className="input"
                    >
                      {allTimezones.map(tz => (
                        <option key={tz} value={tz}>{tz}</option>
                      ))}
                    </select>

                    <p style={{ fontSize: 'var(--fs-200)', color: 'var(--clr-text-muted)', marginTop: 'var(--space-1)' }}>
                      Frontend edits times in this timezone; backend saves them as UTC.
                    </p>

                    {/* Preview */}
                    <div className="surface" style={{ marginTop: 'var(--space-4)', padding: 'var(--space-4)' }}>
                      <div style={{ fontSize: 'var(--fs-300)', fontWeight: 600, marginBottom: 6 }}>Preview</div>
                      <div style={{ fontSize: 'var(--fs-200)', marginBottom: 2 }}>
                        Local: <code>{previewLocal}</code>
                      </div>
                      <div style={{ fontSize: 'var(--fs-200)' }}>
                        UTC (will be saved): <code>{previewUTC}</code>
                      </div>
                      <div style={{ fontSize: 'var(--fs-200)', opacity: 0.8, marginTop: 6 }}>
                        Overnight windows (e.g., 22:00–06:00) are supported by the backend logic.
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
                  <button
                    onClick={handleSaveSettings}
                    className="btn btn--primary btn--lg"
                    disabled={Object.keys(pendingSettings).length === 0}
                  >
                    Save All Settings Changes
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
