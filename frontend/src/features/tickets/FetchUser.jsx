import { useEffect, useState, useMemo } from 'react';
import { api } from '../../lib/api.js';
import Swal from 'sweetalert2';

export default function FetchUser() {
  const [customers, setCustomers] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Process data to create user list with ticket counts
  const usersWithTickets = useMemo(() => {
    const ticketCounts = tickets.reduce((acc, ticket) => {
      const customerId = ticket.customerId;
      if (!acc[customerId]) {
        acc[customerId] = { open: 0, closed: 0 };
      }
      if (ticket.status === 'closed') {
        acc[customerId].closed++;
      } else {
        acc[customerId].open++;
      }
      return acc;
    }, {});

    return customers.map(customer => ({
      ...customer,
      openTickets: ticketCounts[customer.id]?.open || 0,
      closedTickets: ticketCounts[customer.id]?.closed || 0,
    }));
  }, [customers, tickets]);

  async function loadData() {
    setLoading(true);
    try {
      const [customersData, ticketsData] = await Promise.all([
        api('/api/customers'),
        api('/api/tickets?pageSize=1000'), // Fetch all tickets, assuming not too many
      ]);
      if (customersData.length === 0) {
        Swal.fire({
          icon: 'info',
          title: 'No users found',
          text: 'No users were found in the system.',
        });
      }
      setCustomers(customersData);
      setTickets(ticketsData.data || []);
    } catch (e) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: e.message,
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return <div>Loading users...</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>All Users</h2>
      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: 12, minWidth: 600 }}>
          <thead style={{ background: '#f3f4f6', textAlign: 'left' }}>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Phone Number</th>
              <th style={th}>Open Tickets</th>
              <th style={th}>Closed Tickets</th>
            </tr>
          </thead>
          <tbody>
            {usersWithTickets.length === 0 ? (
              <tr>
                <td style={td} colSpan={5}>
                  No users found
                </td>
              </tr>
            ) : (
              usersWithTickets.map((user) => (
                <tr key={user.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{user.name}</td>
                  <td style={td}>{user.email}</td>
                  <td style={td}>{user.phone || '-'}</td>
                  <td style={td}>{user.openTickets}</td>
                  <td style={td}>{user.closedTickets}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const th = { padding: 8 };
const td = { padding: 8, verticalAlign: 'top' };
