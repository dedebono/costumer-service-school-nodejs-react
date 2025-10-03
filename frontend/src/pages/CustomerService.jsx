import { useAuth } from '../context/AuthContext.jsx';
import TicketSearch from '../features/tickets/TicketSearch.jsx';
import FetchUser from '../features/tickets/FetchUsers.jsx';
import TicketsTable from '../features/tickets/TicketsTable.jsx';
import TicketCreate from '../features/tickets/TicketCreate.jsx';
import Admission from './Admission.jsx';
import CSDashboard from './CSDashboard.jsx';
import { useState, useEffect, useRef } from 'react';
import Sidebar from '../components/Sidebar.jsx';
import io from 'socket.io-client';
import Swal from 'sweetalert2';

const groupedTabs = [
    {
    title: 'CRM',
    items: [
      { value: 'admission', label: 'PMB' }
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
    title: 'Queue',
    items: [
      { value: 'cs-dashboard', label: 'CS Dashboard' },
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
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = io(import.meta.env.VITE_SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server for notifications');
      socketRef.current.emit('join-notifications');
    });

    socketRef.current.on('queue-update', (data) => {
      console.log('New queue ticket added:', data);
      Swal.fire({
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000,
        timerProgressBar: true,
        icon: 'info',
        title: `New queue ticket added for service ${data.serviceName || 'unknown'}`
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  return (
    <div className="page">
      <Sidebar tab={tab} setTab={setTab} groupedTabs={groupedTabs} />
      <main className="main-content">
        <Header user={user} onLogout={logout} />
        <div className="grid grid--1">
          <div className="surface">
            {tab === 'search' && <TicketSearch />}
            {tab === 'create' && <TicketCreate />}
            {tab === 'tickets' && <TicketsTable CustomerService />}
            {tab === 'users' && <FetchUser />}
            {tab === 'admission' && <Admission hideAddStep hideCreatePipeline />}
            {tab === 'cs-dashboard' && <CSDashboard />}
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
        <span className="badge-name">{user.username} • {user.role}</span>
        <button onClick={onLogout} className="btn btn--primary">Logout</button>
      </div>
    </div>
  );
}
