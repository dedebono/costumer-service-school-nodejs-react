import { useAuth } from '../context/AuthContext.jsx';
import TicketsTable from '../features/tickets/TicketsTable.jsx';
import CreateUserForm from '../features/users/CreateUserForm.jsx';
import TicketSearch from '../features/tickets/TicketSearch.jsx';
import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import PipelineBuilder from '../features/admission/PipelineBuilder.jsx';
import Sidebar from '../components/Sidebar.jsx';

const groupedTabs = [
  {
    title: 'Tickets',
    items: [
      { value: 'tickets', label: 'Fetch All Tickets' },
      { value: 'search', label: 'Search & Filters' },
    ],
  },
  {
    title: 'Users',
    items: [
      { value: 'createUser', label: 'Create Customer Service account' },
    ],
  },
  {
    title: 'Admission',
    items: [
      { value: 'pipelineBuilder', label: 'Pipeline Builder' },
    ],
  },
];

export default function Supervisor() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('tickets');

  return (
    <div className="page">
      <Sidebar tab={tab} setTab={setTab} groupedTabs={groupedTabs} />
      <main className="main-content">
        <Header user={user} onLogout={logout} />
        <div className="grid">
          <div className="surface p-4">
            {tab === 'tickets' && <TicketsTable supervisor />}
            {tab === 'createUser' && <CreateUserForm />}
            {tab === 'search' && <TicketSearch />}
            {tab === 'pipelineBuilder' && <PipelineBuilderForSupervisor />}
          </div>
        </div>
      </main>
    </div>
  );
}

function PipelineBuilderForSupervisor() {
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState(null);

  useEffect(() => {
    async function fetchPipelines() {
      try {
        const data = await api('/api/admission/pipelines');
        setPipelines(data);
        if (data.length > 0) {
          setSelectedPipelineId(data[0].id);
        }
      } catch (e) {
        alert('Failed to fetch pipelines: ' + e.message);
      }
    }
    fetchPipelines();
  }, []);

  return (
    <div>
      <h2>Select Pipeline to Manage Steps</h2>
      <select value={selectedPipelineId || ''} onChange={e => setSelectedPipelineId(e.target.value)}>
        {pipelines.map(p => (
          <option key={p.id} value={p.id}>
            {p.name} ({p.year})
          </option>
        ))}
      </select>
      {selectedPipelineId && 
      <PipelineBuilder pipelineId={selectedPipelineId} />}
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
