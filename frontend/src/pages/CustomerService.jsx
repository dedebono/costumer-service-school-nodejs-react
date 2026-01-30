import { useAuth } from '../context/AuthContext.jsx';
import { Rocket, CheckCircle, GraduationCap, Search, Plus, Ticket, Users, User, LogOut } from 'lucide-react';
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
import CSCompleted from './CSCompleted.jsx';

const groupedTabs = [
  {
    title: 'Antrian',
    items: [
      { value: 'cs-dashboard', label: 'Dashboard', icon: <Rocket size={20} /> },
      { value: 'CSCompleted', label: 'Selesai', icon: <CheckCircle size={20} /> }
    ],
  },
  {
    title: 'CRM',
    items: [
      { value: 'admission', label: 'PMB', icon: <GraduationCap size={20} /> },
    ],
  },
  {
    title: 'Tiket',
    items: [
      { value: 'search', label: 'Cari', icon: <Search size={20} /> },
      { value: 'create', label: 'Buat', icon: <Plus size={20} /> },
      { value: 'tickets', label: 'Semua', icon: <Ticket size={20} /> },
    ],
  },
  {
    title: 'Pengguna',
    items: [
      { value: 'users', label: 'Konsumen', icon: <Users size={20} /> },
    ],
  },
];

export default function CustomerService() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState(() => {
    // Check for hash in URL to determine initial tab
    const hash = window.location.hash.replace('#', '');
    return hash || 'cs-dashboard';
  });
  const socketRef = useRef(null);

  useEffect(() => {
    // Listen for hash changes to update tab
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash) {
        setTab(hash);
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

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
        title: `Antrian baru: ${data.serviceName || 'unknown'}`
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
            {tab === 'admission' && <Admission hideAddStep hideCreatePipeline hideSortableItem hidePipelineBuilder />}
            {tab === 'cs-dashboard' && <CSDashboard />}
            {tab === 'CSCompleted' && <CSCompleted />}
          </div>
        </div>
      </main>
    </div>
  );
}

function Header({ user, onLogout }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="mt-0" style={{ fontSize: '1.25rem', color: '#1e293b' }}>EDUCATION CONSULTANT PORTAL</h1>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '20px',
          padding: '6px 12px', fontSize: '13px', color: '#64748b'
        }}>
          <User size={14} />
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{user.username}</span>
          <span style={{ color: '#cbd5e1' }}>•</span>
          <span>{user.role}</span>
        </div>

        <button
          onClick={onLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            background: '#fff', border: '1px solid #ef4444', borderRadius: '8px',
            padding: '6px 12px', fontSize: '13px', fontWeight: '500',
            color: '#ef4444', cursor: 'pointer', transition: 'all 0.2s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
          onMouseLeave={e => e.currentTarget.style.background = '#fff'}
          title="Logout"
        >
          <LogOut size={14} /> Logout
        </button>
      </div>
    </div>
  );
}
