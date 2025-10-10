

import { api as apiHelper } from './lib/api';

export const api = {
  // Get all tickets
  getTickets: async () => {
    return apiHelper('/tickets');
  },

  // Get a single ticket by ID
  getTicket: async (id) => {
    return apiHelper(`/tickets/${id}`);
  },

  // Create a new ticket
  createTicket: async (ticketData) => {
    return apiHelper('/tickets', { method: 'POST', body: ticketData });
  },

  // Update a ticket
  updateTicket: async (id, ticketData) => {
    return apiHelper(`/tickets/${id}`, { method: 'PUT', body: ticketData });
  },

  // Delete a ticket
  deleteTicket: async (id) => {
    return apiHelper(`/tickets/${id}`, { method: 'DELETE' });
  },

  // Get queue status
  getQueueStatus: async () => {
    return apiHelper('/queue/status');
  },

  // Queue API endpoints
  queue: {
    // Get queue for a service
    getQueue: async (serviceId, status, limit = 50) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (limit) params.append('limit', limit);
      return apiHelper(`/queue/${serviceId}?${params}`);
    },

    // Get queue status counts
    getQueueStatus: async (serviceId) => {
      return apiHelper(`/queue/${serviceId}/status`);
    },

    // Get specific queue ticket
    getQueueTicket: async (id) => {
      return apiHelper(`/queue/ticket/${id}`);
    },

    // Claim a ticket
    claimTicket: async (id) => {
      return apiHelper(`/queue/ticket/${id}/claim`, { method: 'POST' });
    },

    // Start service for a ticket
    startService: async (id) => {
      return apiHelper(`/queue/ticket/${id}/start`, { method: 'POST' });
    },

    // Resolve a ticket
    resolveTicket: async (id, notes) => {
      return apiHelper(`/queue/ticket/${id}/resolve`, { method: 'POST', body: { notes } });
    },

    // Requeue a ticket
    requeueTicket: async (id, notes) => {
      return apiHelper(`/queue/ticket/${id}/requeue`, { method: 'POST', body: { notes } });
    },

    // Mark ticket as no-show
    markNoShow: async (id) => {
      return apiHelper(`/queue/ticket/${id}/no-show`, { method: 'POST' });
    },

    // Cancel a ticket
    cancelTicket: async (id, notes) => {
      return apiHelper(`/queue/ticket/${id}/cancel`, { method: 'POST', body: { notes } });
    },

    // Create support ticket for queue ticket
    createSupportTicket: async (queueTicketId, supportData) => {
      return apiHelper(`/queue/ticket/${queueTicketId}/support`, { method: 'POST', body: supportData });
    },

    // Get support tickets for queue ticket
    getSupportTickets: async (queueTicketId) => {
      return apiHelper(`/queue/ticket/${queueTicketId}/support`);
    },
  },

  // Services API endpoints
  services: {
    getAll: async (activeOnly = true) => {
      const params = new URLSearchParams();
      params.append('activeOnly', activeOnly);
      return apiHelper(`/services?${params}`);
    },

    getById: async (id) => {
      return apiHelper(`/services/${id}`);
    },

    create: async (serviceData) => {
      return apiHelper('/services', { method: 'POST', body: serviceData });
    },

    update: async (id, serviceData) => {
      return apiHelper(`/services/${id}`, { method: 'PATCH', body: serviceData });
    },

    delete: async (id) => {
      return apiHelper(`/services/${id}`, { method: 'DELETE' });
    },
  },

  // Counters API endpoints
  counters: {
    getAll: async (activeOnly = true) => {
      const params = new URLSearchParams();
      params.append('activeOnly', activeOnly);
      return apiHelper(`/counters?${params}`);
    },

    getById: async (id) => {
      return apiHelper(`/counters/${id}`);
    },

    create: async (counterData) => {
      return apiHelper('/counters', { method: 'POST', body: counterData });
    },

    update: async (id, counterData) => {
      return apiHelper(`/counters/${id}`, { method: 'PATCH', body: counterData });
    },

    delete: async (id) => {
      return apiHelper(`/counters/${id}`, { method: 'DELETE' });
    },
  },

  // Kiosk API endpoints (public)
  kiosk: {
    getBuildings: async () => {
      return apiHelper('/kiosk/buildings');
    },

    getQueueGroups: async (buildingId) => {
      const params = new URLSearchParams();
      if (buildingId) params.append('buildingId', buildingId);
      return apiHelper(`/kiosk/queue-groups?${params}`);
    },

    getServices: async (queueGroupId) => {
      const params = new URLSearchParams();
      if (queueGroupId) params.append('queueGroupId', queueGroupId);
      return apiHelper(`/kiosk/services?${params}`);
    },

    createQueueTicket: async (ticketData) => {
      return apiHelper('/kiosk/ticket', { method: 'POST', body: ticketData });
    },

    getQueueTicket: async (id) => {
      return apiHelper(`/kiosk/ticket/${id}`);
    },
  },

  // Admission API endpoints
  admission: {
    // Get all pipelines
    getPipelines: async () => {
      return apiHelper('/admission/pipelines');
    },

    // Get pipeline by ID
    getPipeline: async (id) => {
      return apiHelper(`/admission/pipelines/${id}`);
    },

    // Auto-create applicant from queue data
    autoCreateApplicant: async (applicantData) => {
      return apiHelper('/admission/auto-create-applicant', { method: 'POST', body: applicantData });
    },
  },

  // Admin API endpoints
  admin: {
    // Settings
    getSettings: async () => {
      return apiHelper('/admin/settings');
    },

    getSetting: async (key) => {
      return apiHelper(`/admin/settings/${key}`);
    },

    setSetting: async (key, value) => {
      return apiHelper(`/admin/settings/${key}`, { method: 'PUT', body: { value } });
    },

    // Reports
    getSupportTicketsReport: async (params = {}) => {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          queryParams.append(key, value);
        }
      });
      return apiHelper(`/admin/reports/support-tickets?${queryParams}`);
    },

    getQueueStats: async () => {
      return apiHelper('/admin/reports/queue-stats');
    },
  },

  // Buildings API endpoints
  buildings: {
    getAll: async (activeOnly = true) => {
      const params = new URLSearchParams();
      params.append('activeOnly', activeOnly);
      return apiHelper(`/buildings?${params}`);
    },

    getById: async (id) => {
      return apiHelper(`/buildings/${id}`);
    },

    create: async (buildingData) => {
      return apiHelper('/buildings', { method: 'POST', body: buildingData });
    },

    update: async (id, buildingData) => {
      return apiHelper(`/buildings/${id}`, { method: 'PUT', body: buildingData });
    },

    delete: async (id) => {
      return apiHelper(`/buildings/${id}`, { method: 'DELETE' });
    },
  },

  // Queue Groups API endpoints
  queueGroups: {
    getAll: async (activeOnly = true) => {
      const params = new URLSearchParams();
      params.append('activeOnly', activeOnly);
      return apiHelper(`/queue-groups?${params}`);
    },

    getById: async (id) => {
      return apiHelper(`/queue-groups/${id}`);
    },

    create: async (queueGroupData) => {
      return apiHelper('/queue-groups', { method: 'POST', body: queueGroupData });
    },

    update: async (id, queueGroupData) => {
      return apiHelper(`/queue-groups/${id}`, { method: 'PUT', body: queueGroupData });
    },

    delete: async (id) => {
      return apiHelper(`/queue-groups/${id}`, { method: 'DELETE' });
    },
  },
}
