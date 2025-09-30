import { useAuth } from '../context/AuthContext.jsx';
import TicketSearch from '../features/tickets/TicketSearch.jsx';
import FetchUser from '../features/tickets/FetchUsers.jsx';
import TicketsTable from '../features/tickets/TicketsTable.jsx';
import TicketCreate from '../features/tickets/TicketCreate.jsx';
import Admission from './Admission.jsx';
import { useState } from 'react';
import Sidebar from '../components/Sidebar.jsx';

const groupedTabs = [
    {
    title: 'PMB',
    items: [
      { value: 'admission', label: 'Pendaftaran' }
    ],
  },
  {
    title: 'Tiket',
    items: [
      { value: 'search', label: 'Cari' },
      { value: 'create', label: 'Buat' },
      { value: 'tickets', label: 'Semua' },
    ],
  },
  {
    title: 'Pengguna',
    items: [
      { value: 'users', label: 'Konsumen' },
    ],
  },
];

export default function CustomerService() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('search');

  return (
    <div className="page">
      <Sidebar tab={tab} setTab={setTab} groupedTabs={groupedTabs} />
      <main className="main-content">
        <Header user={user} onLogout={logout} />
        <div className="grid grid--1">
          <div className="surface p-4">
            {tab === 'search' && <TicketSearch />}
            {tab === 'create' && <TicketCreate />}
            {tab === 'tickets' && <TicketsTable CustomerService />}
            {tab === 'users' && <FetchUser />}
            {tab === 'admission' && <Admission hideAddStep hideCreatePipeline />}
          </div>
        </div>
      </main>
    </div>
  );
}

function Header({ user, onLogout }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="mt-0">Customer Service Portal</h1>
      <div className="flex gap-2 items-center">
        <span className="badge">{user.username} • {user.role}</span>
        <button onClick={onLogout} className="btn btn--primary">Logout</button>
      </div>
    </div>
  );
}
