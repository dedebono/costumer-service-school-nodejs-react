import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import PipelineBuilder from '../features/admission/PipelineBuilder.jsx';
import ApplicantsBoard from '../features/admission/ApplicantsBoard.jsx';

export default function Admission({ hideAddStep = false, hideCreatePipeline = false }) {
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateApplicant, setShowCreateApplicant] = useState(false);
  const [applicantRefreshKey, setApplicantRefreshKey] = useState(0);

  useEffect(() => {
    fetchPipelines();
  }, []);

  useEffect(() => {
    if (selectedPipeline) {
      fetchFullPipeline(selectedPipeline.id);
    }
  }, [selectedPipeline?.id]);

  const fetchPipelines = async () => {
    try {
      const list = await api('/api/admission/pipelines');
      setPipelines(list);
    } catch (e) {
      console.error('Failed to fetch pipelines:', e);
    }
  };

  const fetchFullPipeline = async (id) => {
    try {
      const full = await api(`/api/admission/pipelines/${id}`);
      setSelectedPipeline(full);
    } catch (e) {
      console.error('Failed to fetch full pipeline:', e);
    }
  };

  const createPipeline = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const year = formData.get('year');
    try {
      const newP = await api('/api/admission/pipelines', {
        method: 'POST',
        body: { name, year },
      });
      setPipelines([...pipelines, newP]);
      setShowCreate(false);
    } catch (e) {
      console.error('Failed to create pipeline:', e);
    }
  };

  const createApplicant = async (e) => {
    e.preventDefault();
    if (!selectedPipeline.steps || selectedPipeline.steps.length === 0) {
      alert('Please add steps to the pipeline first.');
      return;
    }
    const formData = new FormData(e.target);
    const data = {
      pipeline_id: selectedPipeline.id,
      name: formData.get('name'),
      nisn: formData.get('nisn'),
      birthdate: formData.get('birthdate'),
      parent_phone: formData.get('parent_phone'),
      email: formData.get('email'),
      address: formData.get('address'),
    };
    try {
      await api('/api/admission/applicants', {
        method: 'POST',
        body: data,
      });
      setShowCreateApplicant(false);
      setApplicantRefreshKey(k => k + 1); // Refresh the board
    } catch (e) {
      console.error('Failed to create applicant:', e);
    }
  };

  return (
    <div>
      <h2>Admission Management</h2>
      <div>
        <select value={selectedPipeline?.id || ''} onChange={(e) => setSelectedPipeline(pipelines.find(p => p.id == e.target.value))}>
          <option value="">Select Pipeline</option>
          {pipelines.map(p => <option key={p.id} value={p.id}>{p.name} ({p.year})</option>)}
        </select>
        {!hideCreatePipeline && <button onClick={() => setShowCreate(true)}>Create New Pipeline</button>}
      </div>
      {showCreate && (
        <form onSubmit={createPipeline}>
          <input name="name" placeholder="Pipeline Name" required />
          <input name="year" placeholder="Year" type="number" required />
          <button type="submit">Create</button>
          <button type="button" onClick={() => setShowCreate(false)}>Cancel</button>
        </form>
      )}
      {selectedPipeline && (
        <>
          <div>
            <button onClick={() => setShowCreateApplicant(true)}>Create New Applicant</button>
          </div>
          {showCreateApplicant && (
            <form onSubmit={createApplicant}>
              <input name="name" placeholder="Full Name" required />
              <input name="nisn" placeholder="NISN" />
              <input name="birthdate" type="date" />
              <input name="parent_phone" placeholder="Parent Phone" />
              <input name="email" type="email" placeholder="Email" />
              <textarea name="address" placeholder="Address"></textarea>
              <button type="submit">Create Applicant</button>
              <button type="button" onClick={() => setShowCreateApplicant(false)}>Cancel</button>
            </form>
          )}
          <PipelineBuilder pipelineId={selectedPipeline.id} hideAddStep={hideAddStep} />
          <ApplicantsBoard key={applicantRefreshKey} pipeline={selectedPipeline} />
        </>
      )}
    </div>
  );
}
