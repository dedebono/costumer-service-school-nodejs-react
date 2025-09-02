const API_BASE_URL = '/api'

export const api = {
  // Get all tickets
  getTickets: async () => {
    const response = await fetch(`${API_BASE_URL}/tickets`)
    if (!response.ok) {
      throw new Error('Failed to fetch tickets')
    }
    return response.json()
  },

  // Get a single ticket by ID
  getTicket: async (id) => {
    const response = await fetch(`${API_BASE_URL}/tickets/${id}`)
    if (!response.ok) {
      throw new Error('Failed to fetch ticket')
    }
    return response.json()
  },

  // Create a new ticket
  createTicket: async (ticketData) => {
    const response = await fetch(`${API_BASE_URL}/tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ticketData),
    })
    if (!response.ok) {
      throw new Error('Failed to create ticket')
    }
    return response.json()
  },

  // Update a ticket
  updateTicket: async (id, ticketData) => {
    const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ticketData),
    })
    if (!response.ok) {
      throw new Error('Failed to update ticket')
    }
    return response.json()
  },

  // Delete a ticket
  deleteTicket: async (id) => {
    const response = await fetch(`${API_BASE_URL}/tickets/${id}`, {
      method: 'DELETE',
    })
    if (!response.ok) {
      throw new Error('Failed to delete ticket')
    }
    return response.json()
  },

  // Get queue status
  getQueueStatus: async () => {
    const response = await fetch(`${API_BASE_URL}/queue/status`)
    if (!response.ok) {
      throw new Error('Failed to fetch queue status')
    }
    return response.json()
  },
}
