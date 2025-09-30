
import { useAuth } from '../context/AuthContext.jsx';
import TabBar from '../components/TabBar.jsx';
import TicketSearch from '../features/tickets/TicketSearch.jsx';
import FetchUser from '../features/tickets/FetchUsers.jsx';
import TicketsTable from '../features/tickets/TicketsTable.jsx';
import TicketCreate from '../features/tickets/TicketCreate.jsx';
import Admission from './Admission.jsx';
import { useState } from 'react';

export default function CustomerService() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('search');
  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header user={user} onLogout={logout} />
      <TabBar tabs={{ search: 'Search Old Ticket', create: 'Create New Ticket' , tickets: 'Fetch All Tickets', users:'Customers', admission: 'Admission'  }}
      value={tab} onChange={setTab} />
      {tab === 'search' && <TicketSearch />}
      {tab === 'create' && <TicketCreate />}
      {tab === 'tickets' && <TicketsTable CustomerService />}
      {tab === 'users' && <FetchUser />}
      {tab === 'admission' && <Admission hideAddStep hideCreatePipeline />}
    </div>
  );
}

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
