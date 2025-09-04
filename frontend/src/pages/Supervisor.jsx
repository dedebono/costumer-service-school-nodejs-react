import { useAuth } from '../context/AuthContext.jsx';
import TabBar from '../components/TabBar.jsx';
import TicketsTable from '../features/tickets/TicketsTable.jsx';
import CreateUserForm from '../features/users/CreateUserForm.jsx';
import TicketSearch from '../features/tickets/TicketSearch.jsx';

export default function Supervisor() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('tickets');
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      <Header user={user} onLogout={logout} />
      <TabBar tabs={{ tickets: 'Fetch All Tickets', createUser: 'Create Costumer Service account', search: 'Search & Filters'}} value={tab} onChange={setTab} />
      {tab === 'tickets' && <TicketsTable supervisor />}
      {tab === 'createUser' && <CreateUserForm />}
      {tab === 'search' && <TicketSearch />}
    </div>
  );
}

import { useState } from 'react';
function Header({ user, onLogout }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
      <h1 style={{ margin: 0 }}>Customer Service Portal</h1>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: 12, padding: '4px 8px', borderRadius: 8, background: '#e5e7eb' }}>{user.username} • {user.role}</span>
        <button onClick={onLogout} style={{ padding: '8px 10px', borderRadius: 8, background: '#111', color: '#fff', border: 'none', cursor: 'pointer' }}>Logout</button>
      </div>
    </div>
  );
}