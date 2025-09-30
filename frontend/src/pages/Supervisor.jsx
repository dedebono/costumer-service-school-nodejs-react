
import { useAuth } from '../context/AuthContext.jsx';
import TabBar from '../components/TabBar.jsx';
import TicketsTable from '../features/tickets/TicketsTable.jsx';
import CreateUserForm from '../features/users/CreateUserForm.jsx';
import TicketSearch from '../features/tickets/TicketSearch.jsx';
import { useState } from 'react';
import { api } from '../lib/api.js';
import PipelineBuilder from '../features/admission/PipelineBuilder.jsx';

export default function Supervisor() {
  const { user, logout } = useAuth();
  const [tab, setTab] = useState('tickets');
  const [showPipelineBuilder, setShowPipelineBuilder] = useState(false);

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', padding: 16 }}>
      <Header user={user} onLogout={logout} />
      <TabBar tabs={{ tickets: 'Fetch All Tickets', createUser: 'Create Costumer Service account', search: 'Search & Filters', pipelineBuilder: 'Pipeline Builder' }} value={tab} onChange={setTab} />
      {tab === 'tickets' && <TicketsTable supervisor />}
      {tab === 'createUser' && <CreateUserForm />}
      {tab === 'search' && <TicketSearch />}
      {tab === 'pipelineBuilder' && <PipelineBuilderForSupervisor />}
    </div>
  );
}

import { useEffect } from 'react';

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
      {selectedPipelineId && <PipelineBuilder pipelineId={selectedPipelineId} />}
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
