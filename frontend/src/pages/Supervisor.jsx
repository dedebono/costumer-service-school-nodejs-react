import { useAuth } from '../context/AuthContext.jsx';
import TicketsTable from '../features/tickets/TicketsTable.jsx';
import CreateUserForm from '../features/users/CreateUserForm.jsx';
import TicketSearch from '../features/tickets/TicketSearch.jsx';
import AdminSetup from './AdminSetup.jsx';
import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import PipelineBuilder from '../features/admission/PipelineBuilder.jsx';
import Sidebar from '../components/Sidebar.jsx';

const groupedTabs = [
    {
    title: 'ANTRIAN',
    items: [
      { value: 'admin-setup', label: 'Admin Setup', icon: '⚙️' },
    ],
  },
    {
    title: 'PMB',
    items: [
      { value: 'pipelineBuilder', label: 'Pembuatan Alur PMB', icon: '🎓' },
    ],
  },

  {
    title: 'TIKET',
    items: [
      { value: 'tickets', label: 'Semua Tiket', icon: '🎫' },
      { value: 'search', label: 'Cari Tiket' , icon: '🔍' },
    ],
  },
  {
    title: 'PENGGUNA',
    items: [
      { value: 'createUser', label: 'Kelola Akun', icon: '👥' },
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
            {tab === 'admin-setup' && <AdminSetup />}
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
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineYear, setNewPipelineYear] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editSteps, setEditSteps] = useState([]);
  const [editDynamicDetails, setEditDynamicDetails] = useState({});
  const [selectedSteps, setSelectedSteps] = useState(new Set());

  useEffect(() => {
    async function fetchPipelines() {
      try {
        const data = await api('/admission/pipelines');
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

  const createNewPipeline = async () => {
    if (!newPipelineName || !newPipelineYear) {
      alert('Name and year are required');
      return;
    }
    try {
      const newPipeline = await api('/admission/pipelines', {
        method: 'POST',
        body: { name: newPipelineName, year: newPipelineYear }
      });
      setPipelines(prev => [...prev, newPipeline]);
      setSelectedPipelineId(newPipeline.id);
      setShowCreateForm(false);
      setNewPipelineName('');
      setNewPipelineYear('');
    } catch (e) {
      alert('Failed to create pipeline: ' + e.message);
    }
  };

  const deletePipeline = async () => {
    if (!selectedPipelineId || selectedPipelineId === 'new') return;
    if (confirm('Are you sure you want to delete this pipeline? This will also delete all its steps.')) {
      try {
        await api(`/admission/pipelines/${selectedPipelineId}`, {
          method: 'DELETE',
        });
        setPipelines(prev => prev.filter(p => p.id !== selectedPipelineId));
        setSelectedPipelineId(pipelines.length > 1 ? pipelines.find(p => p.id !== selectedPipelineId)?.id || 'new' : 'new');
      } catch (e) {
        alert('Failed to delete pipeline: ' + e.message);
      }
    }
  };

  const openEditModal = async () => {
    if (!selectedPipelineId || selectedPipelineId === 'new') {
        alert('Please select an existing pipeline to edit.');
        return;
    }
    try {
      const pipeline = await api(`/admission/pipelines/${selectedPipelineId}`);
      // Ensure we clone the steps array for editing
      setEditSteps(pipeline.steps ? [...pipeline.steps] : []);
      // Fetch dynamic details for each step
      const detailsPromises = pipeline.steps.map(step =>
        api(`/admission/${selectedPipelineId}/steps/${step.id}/details`).catch(() => [])
      );
      const detailsResults = await Promise.all(detailsPromises);
      const newDetails = {};
      pipeline.steps.forEach((step, index) => {
        newDetails[step.id] = detailsResults[index];
      });
      setEditDynamicDetails(newDetails);
      setShowEditModal(true);
    } catch (e) {
      alert('Failed to load pipeline: ' + e.message);
    }
  };

  const saveEditSteps = async () => {
    try {
      // Save steps
      for (const step of editSteps) {
        if (!step.title || !step.slug) {
          alert('Title and slug are required for all steps');
          return;
        }
        await api(`/admission/${selectedPipelineId}/steps/${step.id}`, {
          method: 'PUT',
          body: { title: step.title, slug: step.slug, is_final: step.is_final },
        });
      }

      // Save dynamic details for each step
      for (const step of editSteps) {
        const details = editDynamicDetails[step.id] || [];
        for (const detail of details) {
          if (!detail.key || !detail.type || !detail.label) {
            alert(`Key, type, and label are required for all dynamic details in step ${step.title}`);
            return;
          }
          if (detail.id) {
            // Update existing
            await api(`/admission/${selectedPipelineId}/steps/${step.id}/details/${detail.id}`, {
              method: 'PUT',
              body: { key: detail.key, type: detail.type, required: detail.required, label: detail.label, options: detail.options },
            });
          } else {
            // Create new
            await api(`/admission/${selectedPipelineId}/steps/${step.id}/details`, {
              method: 'POST',
              body: { key: detail.key, type: detail.type, required: detail.required, label: detail.label, options: detail.options },
            });
          }
        }
      }

      setShowEditModal(false);
      // Optionally reload or update state
    } catch (e) {
      alert('Failed to save changes: ' + e.message);
    }
  };

  return (
    <div>
      <h2>Pilih Alur PMB / Buat Baru</h2>
      <div className="flex gap-2 items-center mb-4">
        <select className='option-selector'
        value={selectedPipelineId || ''} onChange={e => { setSelectedPipelineId(e.target.value); setShowCreateForm(e.target.value === "new"); }}>
          <option value="new">Alur PMB baru</option>
          {pipelines.map(p => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.year})
            </option>
          ))}
        </select>
        {selectedPipelineId && selectedPipelineId !== 'new' && (
          <>
            <button className="btn btn--primary" onClick={openEditModal}>
              Edit Alur
            </button>
            <button className="btn btn--danger" onClick={deletePipeline}>
              Hapus Alur
            </button>
          </>
        )}
      </div>
      {showCreateForm ? (
        <div>
          <h3>Buat Alur PMB Baru</h3>
          <div className="flex gap-2 mb-2">
            <input
              className="input-modal"
              type="text"
              placeholder="Nama Alur"
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
            />
            <input
              className="input-modal"
              type="text"
              placeholder="tahun"
              value={newPipelineYear}
              onChange={(e) => setNewPipelineYear(e.target.value)}
            />
            <button className="btn btn--primary" onClick={createNewPipeline}>
              Buat Alur
            </button>
          </div>
        </div>
      ) : (
        selectedPipelineId && selectedPipelineId !== 'new' && <PipelineBuilder pipelineId={selectedPipelineId} />
      )}

      {/* Edit Steps Modal - CORRECTED FOR POP-UP */}
      {showEditModal && (
        <div className="modals-overlay">
          <div className="modals">
            <header className="modals-header">
              <h3>
                Edit alur
                <button
                  className="btn-close"
                  onClick={() => setShowEditModal(false)}
                >
                  ✖
                </button>
              </h3>
            </header>

            <div className="modals-body">
              {/* Add New Step Section (Optional, but useful) */}
              {/* ... (Your existing 'Add New Step' logic would go here if you had it) */}

              {/* Steps Grid for 3-Column Layout */}
              <div className="steps-grid">
                {editSteps.map((step, index) => (
                  <div key={step.id} className="step-item">
                    <h4>Step {index + 1}</h4>
                    <div className="flex flex-col gap-2 mb-2">
                      <input
                        className="input"
                        type="text"
                        placeholder="Title"
                        value={step.title}
                        onChange={(e) => {
                          const newSteps = [...editSteps];
                          newSteps[index].title = e.target.value;
                          setEditSteps(newSteps);
                        }}
                      />
                      <input
                        className="input"
                        type="text"
                        placeholder="Slug"
                        value={step.slug}
                        onChange={(e) => {
                          const newSteps = [...editSteps];
                          newSteps[index].slug = e.target.value;
                          setEditSteps(newSteps);
                        }}
                      />
                      <label className="flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={step.is_final}
                          onChange={(e) => {
                            const newSteps = [...editSteps];
                            newSteps[index].is_final = e.target.checked;
                            setEditSteps(newSteps);
                          }}
                        />
                        Final
                      </label>
                    </div>
                    {/* Dynamic Details Section */}
                    <div className="dynamic-details-section">
                      <h5>Step Dynamic Details</h5>
                      {(editDynamicDetails[step.id] || []).map((detail, dIndex) => (
                        <div key={detail.id} className="dynamic-detail-item flex items-center gap-2 mb-1">
                          <input
                            type="text"
                            placeholder="Label"
                            value={detail.label}
                            onChange={(e) => {
                              const newDetails = { ...editDynamicDetails };
                              newDetails[step.id][dIndex].label = e.target.value;
                              setEditDynamicDetails(newDetails);
                            }}
                            className="input"
                          />
                          <input
                            type="text"
                            placeholder="Key"
                            value={detail.key}
                            onChange={(e) => {
                              const newDetails = { ...editDynamicDetails };
                              newDetails[step.id][dIndex].key = e.target.value;
                              setEditDynamicDetails(newDetails);
                            }}
                            className="input"
                          />
                          <select
                            value={detail.type}
                            onChange={(e) => {
                              const newDetails = { ...editDynamicDetails };
                              newDetails[step.id][dIndex].type = e.target.value;
                              setEditDynamicDetails(newDetails);
                            }}
                            className="input"
                          >
                            <option value="text">Text</option>
                            <option value="number">Number</option>
                            <option value="date">Date</option>
                            <option value="checkbox">Checkbox</option>
                            <option value="select">Optional Choose</option>
                          </select>
                          {detail.type === 'select' && (
                            <input
                              type="text"
                              placeholder="Options (comma separated, e.g. cash, debit)"
                              value={detail.options || ''}
                              onChange={(e) => {
                                const newDetails = { ...editDynamicDetails };
                                newDetails[step.id][dIndex].options = e.target.value;
                                setEditDynamicDetails(newDetails);
                              }}
                              className="input"
                            />
                          )}
                          <label className="flex items-center gap-1">
                            <input
                              type="checkbox"
                              checked={detail.required}
                              onChange={(e) => {
                                const newDetails = { ...editDynamicDetails };
                                newDetails[step.id][dIndex].required = e.target.checked;
                                setEditDynamicDetails(newDetails);
                              }}
                            />
                            Required
                          </label>
                          <button
                            className="btn btn--danger btn-sm"
                            onClick={async () => {
                              if (detail.id) {
                                // Delete from backend
                                try {
                                  await api(`/admission/${selectedPipelineId}/steps/${step.id}/details/${detail.id}`, {
                                    method: 'DELETE',
                                  });
                                } catch (e) {
                                  alert('Failed to delete dynamic detail: ' + e.message);
                                  return;
                                }
                              }
                              // Remove from local state
                              const newDetails = { ...editDynamicDetails };
                              newDetails[step.id].splice(dIndex, 1);
                              setEditDynamicDetails(newDetails);
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                      <button
                        className="btn btn--primary btn-sm"
                        onClick={() => {
                          const newDetails = { ...editDynamicDetails };
                          if (!newDetails[step.id]) newDetails[step.id] = [];
                          newDetails[step.id].push({ id: null, key: '', type: 'text', required: false, label: '' });
                          setEditDynamicDetails(newDetails);
                        }}
                      >
                        Add Dynamic Detail
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <footer className="modals-footer">
              <button className="btn btn--primary" onClick={saveEditSteps}>
                Save Changes
              </button>
              <button className="btn btn--subtle" onClick={() => setShowEditModal(false)}>
                Cancel
              </button>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}

function Header({ user, onLogout }) {
  return (
    <div className="flex justify-between items-center mb-4">
      <h1 className="mt-0">EDUCATION COUNSULTAN ADMIN</h1>
      <div className="flex gap-2 items-center">
        <span className="badge">{user.username} • {user.role}</span>
        <button onClick={onLogout} className="btn btn--primary">Logout</button>
      </div>
    </div>
  );
}