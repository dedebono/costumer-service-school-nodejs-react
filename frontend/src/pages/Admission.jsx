import { useState, useEffect } from 'react';
import { api } from '../lib/api.js';
import PipelineBuilder from '../features/admission/PipelineBuilder.jsx';
import ApplicantsBoard from '../features/admission/ApplicantsBoard.jsx';
import Swal from 'sweetalert2';
import Modal from '../components/modal.jsx'; // ⬅️ import modal

export default function Admission({ hideAddStep = false, hideCreatePipeline = false, hidePipelineBuilder = false }) {
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateApplicant, setShowCreateApplicant] = useState(false);
  const [applicantRefreshKey, setApplicantRefreshKey] = useState(0);

  useEffect(() => { fetchPipelines(); }, []);
  useEffect(() => { if (selectedPipeline) fetchFullPipeline(selectedPipeline.id); }, [selectedPipeline?.id]);

  const fetchPipelines = async () => {
    try {
      const list = await api('/admission/pipelines');
      setPipelines(list);
    } catch (e) { console.error('Failed to fetch pipelines:', e); }
  };

  const fetchFullPipeline = async (id) => {
    try {
      const full = await api(`/admission/pipelines/${id}`);
      setSelectedPipeline(full);
    } catch (e) { console.error('Failed to fetch full pipeline:', e); }
  };

  const createPipeline = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const name = formData.get('name');
    const year = formData.get('year');
    try {
      const newP = await api('/admission/pipelines', { method: 'POST', body: { name, year } });
      setPipelines([...pipelines, newP]);
      setShowCreate(false);
    } catch (e) { console.error('Failed to create pipeline:', e); }
  };

  const createApplicant = async (e) => {
    e.preventDefault();
    if (!selectedPipeline?.steps?.length) {
      Swal.fire('Warning', 'Please add steps to the pipeline first.', 'warning');
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
      await api('/admission/applicants', { method: 'POST', body: data });
      Swal.fire('Success', 'Applicant created successfully!', 'success');
      setShowCreateApplicant(false);
      setApplicantRefreshKey((k) => k + 1); // refresh board
    } catch (e) {
      console.error('Failed to create applicant:', e);
      Swal.fire('Error', 'Failed to create applicant. Please try again.', 'error');
    }
  };

  return (
    <div className="container-PMB">
      <h2>Penerimaan Siswa Baru</h2>
  
      <div>
        <select
          className="select-pmb"
          value={selectedPipeline?.id || ''}
          onChange={(e) => setSelectedPipeline(pipelines.find(p => p.id == e.target.value))}
        >
          <option value="">Pilih Alur PMB</option>
          {pipelines.map(p => (
            <option key={p.id} value={p.id}>{p.name} ({p.year})</option>
          ))}
        </select>

        {!hideCreatePipeline && (
          <button className="btn btn--primary" onClick={() => setShowCreate(true)}>
            Create New Pipeline
          </button>
        )}
      </div>

      {/* Pipeline create (tetap inline form, opsional nanti dipindah ke modal juga) */}
      {showCreate && (
        <form onSubmit={createPipeline} className="surface p-4 mb-4">
          <input className="input mb-2" name="name" placeholder="Pipeline Name" required />
          <input className="input mb-2" name="year" placeholder="Year" type="number" required />
          <div className="flex gap-2">
            <button type="submit" className="btn btn--primary">Create</button>
            <button type="button" className="btn btn--outline" onClick={() => setShowCreate(false)}>Cancel</button>
          </div>
        </form>
      )}

      {selectedPipeline && (
        <>
          <div className="mb-4">
            <button className="btn btn--primary" onClick={() => setShowCreateApplicant(true)}>
              Pendaftaran Siswa
            </button>
          </div>

          {/* ⬇️ Modal Create Applicant */}
          <Modal
            open={showCreateApplicant}
            title="Data Siswa"
            onClose={() => setShowCreateApplicant(false)}
            footer={
              <div className="flex gap-2">
                {/* tombol submit di footer akan trigger form via form attribute */}
                <button type="submit" form="create-applicant-form" className="btn btn--primary">
                  Simpan
                </button>
                <button type="button" className="btn btn--outline" onClick={() => setShowCreateApplicant(false)}>
                  Batal
                </button>
              </div>
            }
          >
            <form id="create-applicant-form" onSubmit={createApplicant}>
              <input className="input mb-2" name="name" placeholder="Nama Lengkap Siswa" required autoFocus />
              <input className="input mb-2" name="nisn" placeholder="NISN" />
              <div className="grid grid--2">
                <input className="input" name="birthdate" type="date" placeholder="Tanggal Lahir" />
                <input className="input" name="parent_phone" placeholder="Nomor Telepon orang tua" />
              </div>
              <input className="input my-2" name="email" type="email" placeholder="Email" />
              <textarea className="textarea mb-2" name="address" placeholder="Alamat"></textarea>
            </form>
          </Modal>

          {!hidePipelineBuilder && <PipelineBuilder pipelineId={selectedPipeline.id} hideAddStep={hideAddStep} />}
          <ApplicantsBoard key={applicantRefreshKey} pipeline={selectedPipeline} />
        </>
      )}
    </div>
  );
}
