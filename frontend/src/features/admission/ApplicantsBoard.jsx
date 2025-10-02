import { useState, useEffect, useRef } from 'react';
import { api } from '../../lib/api.js';
import DraggableApplicant from './DraggableApplicant.jsx';

/* Simple inline Modal; replace with your shared Modal if you have one */
function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="modal" data-open>
      <div className="modal__backdrop" onClick={onClose} />
      <div className="modal__dialog" role="dialog" aria-modal="true" aria-labelledby="applicant-title" onClick={(e)=>e.stopPropagation()}>
        <header className="modal__header">
          <h3 id="applicant-title">{title}</h3>
          <button className="btn btn--ghost modal__close" onClick={onClose}>✕</button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}

export default function ApplicantsBoard({ pipeline }) {
  const [columns, setColumns] = useState(() =>
    (pipeline.steps || []).sort((a, b) => a.ord - b.ord).map(s => ({ step: s, items: [] }))
  );

  const [selectedStepId, setSelectedStepId] = useState(() => columns[0]?.step.id || null);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResult, setSearchResult] = useState(null);

  const fileInputRef = useRef(null);

  // Click-to-open modal state
  const [selectedApplicant, setSelectedApplicant] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [notes, setNotes] = useState('');
  const [stepDynamicDetails, setStepDynamicDetails] = useState([]);
  const [applicantDynamicDetails, setApplicantDynamicDetails] = useState({});

  const reloadApplicantCard = async () => {
    try {
      const list = await api(`/api/admission/applicants?pipelineId=${pipeline.id}`);
      setColumns(cols => cols.map(c => ({
        ...c, items: list.filter(a => a.current_step_id === c.step.id)
      })));
    } catch (e) {
      console.error('Failed to load applicants:', e);
    }
  };

  useEffect(() => {
    setColumns((pipeline.steps || []).sort((a, b) => a.ord - b.ord).map(s => ({ step: s, items: [] })));
  }, [pipeline.steps]);

  useEffect(() => {
    if (pipeline.steps && pipeline.steps.length > 0) reloadApplicantCard();
  }, [pipeline.id, pipeline.steps]);



  // Click handler to open modal with details
  const handleApplicantClick = async (applicant) => {
    setSelectedApplicant(applicant);
    setNotes(applicant.notes || '');
    setIsEditing(false);
    // Fetch step dynamic details
    try {
      const stepDetails = await api(`/api/admission/${pipeline.id}/steps/${applicant.current_step_id}/details`);
      setStepDynamicDetails(stepDetails);
      // Fetch applicant dynamic details
      const appDetails = await api(`/api/admission/applicants/${applicant.id}/dynamic-details`);
      // Map appDetails by detail_key
      const detailsMap = {};
      appDetails.forEach(d => {
        detailsMap[d.detail_key] = d.value;
      });
      setApplicantDynamicDetails(detailsMap);
    } catch (e) {
      console.error('Failed to load dynamic details:', e);
      setStepDynamicDetails([]);
      setApplicantDynamicDetails({});
    }
  };

  const handleSaveNotes = async () => {
    try {
      // Save notes without validation of required fields (allow partial or null)
      await api(`/api/admission/applicants/${selectedApplicant.id}`, {
        method: 'PUT',
        body: { notes }
      });
      // Save dynamic details
      const dynamicDetailsToSave = stepDynamicDetails.map(detail => ({
        detail_key: detail.key,
        value: applicantDynamicDetails[detail.key] || null
      }));
      await api(`/api/admission/applicants/${selectedApplicant.id}/dynamic-details`, {
        method: 'POST',
        body: { details: dynamicDetailsToSave }
      });
      // Update the applicant in columns
      setColumns(cols => cols.map(c => ({
        ...c,
        items: c.items.map(item => item.id === selectedApplicant.id ? { ...item, notes } : item)
      })));
      setIsEditing(false);

      // Auto move to next step if all required dynamic details are filled
      const allRequiredFilled = stepDynamicDetails.every(detail => {
        if (!detail.required) return true;
        const val = applicantDynamicDetails[detail.key];
        return val !== undefined && val !== null && val !== '';
      });

      if (allRequiredFilled) {
        // Find current step index
        const currentStepIndex = pipeline.steps.findIndex(s => s.id === selectedApplicant.current_step_id);
        if (currentStepIndex !== -1 && currentStepIndex < pipeline.steps.length - 1) {
          const nextStep = pipeline.steps[currentStepIndex + 1];
          try {
            await api(`/api/admission/${selectedApplicant.id}/move`, {
              method: 'POST',
              body: { toStepId: nextStep.id }
            });
            // Refresh applicants list to reflect move
            reloadApplicantCard();
            setSelectedApplicant(null);
          } catch (e) {
            alert(`Failed to auto-move to next step: ${e.message}`);
          }
        }
      }
    } catch (e) {
      alert(`Failed to save: ${e.message}`);
    }
  };

  const handleSearch = () => {
    if (!searchTerm.trim()) return;
    const allApplicants = columns.flatMap(col => col.items);
    const found = allApplicants.filter(app =>
      app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (app.parent_phone && app.parent_phone.includes(searchTerm))
    );
    if (found.length > 0) {
      const targetStepId = found[0].current_step_id;
      setSelectedStepId(targetStepId);
      setSearchResult(found.filter(f => f.current_step_id === targetStepId));
      setSearchTerm('');
    } else {
      alert('Applicant not found');
      setSearchResult(null);
    }
  };

  const handleExportCSV = () => {
    columns.forEach(col => {
      const csvData = [];
      // Header
      csvData.push(['ID', 'Name', 'NISN', 'Birthdate', 'Parent Phone', 'Email', 'Address', 'Notes']);
      // Rows
      col.items.forEach(applicant => {
        csvData.push([
          applicant.id,
          applicant.name,
          applicant.nisn || '',
          applicant.birthdate || '',
          applicant.parent_phone || '',
          applicant.email || '',
          applicant.address || '',
          applicant.notes || ''
        ]);
      });
      // Convert to CSV string
      const csvString = csvData.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
      // Create blob and download
      const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${col.step.title}.csv`;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
  };

  const handleImportCSVClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = null; // reset file input
      fileInputRef.current.click();
    }
  };

  const handleImportCSV = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) {
      alert('CSV file is empty or invalid');
      return;
    }

    // Parse header
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    const requiredHeaders = ['Name', 'NISN', 'Birthdate', 'Parent Phone', 'Email', 'Address', 'Notes'];
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      alert(`Missing required columns: ${missingHeaders.join(', ')}`);
      return;
    }

    // Map header index
    const headerIndex = {};
    headers.forEach((h, i) => {
      headerIndex[h] = i;
    });

    // Parse rows and create applicants
    const newApplicants = [];
    for (let i = 1; i < lines.length; i++) {
      const row = lines[i].split(',').map(cell => cell.trim().replace(/^"|"$/g, ''));
      if (row.length !== headers.length) continue; // skip invalid row

      const applicantData = {
        name: row[headerIndex['Name']] || '',
        nisn: row[headerIndex['NISN']] || '',
        birthdate: row[headerIndex['Birthdate']] || '',
        parent_phone: row[headerIndex['Parent Phone']] || '',
        email: row[headerIndex['Email']] || '',
        address: row[headerIndex['Address']] || '',
        notes: row[headerIndex['Notes']] || '',
        pipeline_id: pipeline.id,
        current_step_id: selectedStepId
      };

      newApplicants.push(applicantData);
    }

    if (newApplicants.length === 0) {
      alert('No valid applicants found in CSV');
      return;
    }

    try {
      // Bulk create applicants sequentially
      for (const applicant of newApplicants) {
        await api('/api/admission/applicants', {
          method: 'POST',
          body: applicant
        });
      }
      alert(`Successfully imported ${newApplicants.length} applicants.`);
      reloadApplicantCard();
    } catch (e) {
      alert(`Failed to import applicants: ${e.message}`);
    }
  };

  const selectedColumn = columns.find(c => c.step.id === selectedStepId);

  return (
    <>
      <div style={{ marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search by name or phone number"
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{ marginRight: '0.5rem', padding: '0.5rem', width: '200px', margin: '1rem 1rem 0 0', borderRadius: '4px', border: '1px solid #ccc' }}
        />
        <button className="btn btn--primary" onClick={handleSearch}>Search</button>
        <button className="btn btn--primary" onClick={handleExportCSV} style={{ marginLeft: '0.5rem' }}>Export to CSV</button>
        <button className="btn btn--primary" onClick={handleImportCSVClick} style={{ marginLeft: '0.5rem' }}>Import from CSV</button>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImportCSV}
          accept=".csv"
          style={{ display: 'none' }}
        />
      </div>
      <div style={{ display: 'flex', gap: '0.4rem', padding:'.2rem',}} >
        {columns.map(col => (
          <button
            key={col.step.id}
            className={`btn ${selectedStepId === col.step.id ? 'btn--primary' : 'btn--subtle'}`}
            style={{ backgroundColor: selectedStepId === col.step.id ? '#007bff' : '#c6c6c6ff', 
            color: selectedStepId === col.step.id ? '#fff' : '#000' , fontSize:'1rem' , padding:'0.6rem' }}
            onClick={() => {
              setSelectedStepId(col.step.id);
              setSearchResult(null);
            }}
          >
            {col.step.title} <span style={{color:'black', border:'1px solid white',backgroundColor:'#f7b917', borderRadius:'18px', padding:'0.2rem 0.6rem'}}>{col.items.length}</span>
          </button>
        ))}
      </div>
      <ul className="applicant-list" style={{ marginTop: '1rem' }}>
        {(searchResult && searchResult.length > 0 ? searchResult : selectedColumn?.items || []).map(item => (
          <DraggableApplicant
            key={item.id}
            applicant={item}
            onClick={() => handleApplicantClick(item)}
          />
        ))}
      </ul>

      {/* Applicant details modal */}
      <Modal
        open={!!selectedApplicant}
        title="Data Siswa"
        onClose={() => setSelectedApplicant(null)}
        footer={
          <>
            <button className="btn btn--secondary" onClick={() => setIsEditing(!isEditing)}>
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
            {isEditing && (
              <button className="btn btn--primary" onClick={handleSaveNotes}>
                Save
              </button>
            )}
            {!isEditing && (
              <button className="btn btn--primary" onClick={() => setSelectedApplicant(null)}>
                Close
              </button>
            )}
          </>
        }
      >
        {selectedApplicant && (
          <div style={{display:'grid', gap:'0.5rem'}} >
            <div><strong>Nama Lengkap:</strong> {selectedApplicant.name}</div>
            {selectedApplicant.nisn && <div><strong>NISN:</strong> {selectedApplicant.nisn}</div>}
            {selectedApplicant.birthdate && <div><strong>Tanggal Lahir:</strong> {selectedApplicant.birthdate}</div>}
            {selectedApplicant.parent_phone && <div><strong>Nomor telepon:</strong> {selectedApplicant.parent_phone}</div>}
            {selectedApplicant.email && <div><strong>Email:</strong> {selectedApplicant.email}</div>}
            {selectedApplicant.address && <div><strong>Alamat:</strong> {selectedApplicant.address}</div>}
            <div>
              <strong>Notes:</strong>
              {isEditing ? (
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={5}
                  style={{ width: '100%', padding: '0.5rem', fontFamily: 'inherit' }}
                />
              ) : (
                <p style={{ whiteSpace: 'pre-wrap', border: '1px solid #ccc', padding: '0.5rem', minHeight: '5rem' }}>
                  {notes || <em>No notes available</em>}
                </p>
              )}
            </div>
            {stepDynamicDetails.length > 0 && (
              <div>
                <strong>Detail</strong>
                <div style={{ marginTop: '0.5rem' , display:'grid', gap:'0.2rem'}}>
                  {stepDynamicDetails.map(detail => (
                    <div key={detail.id} style={{ marginBottom: '0.5rem' }}>
                      <label>
                        <strong>{detail.label}{detail.required ? ' *' : ''}:</strong>
                        {isEditing ? (
                          detail.type === 'checkbox' ? (
                            <input
                              type="checkbox"
                              checked={applicantDynamicDetails[detail.key] === 'true' || applicantDynamicDetails[detail.key] === true}
                              onChange={e => setApplicantDynamicDetails(prev => ({ ...prev, [detail.key]: e.target.checked.toString() }))}
                            />
                          ) : detail.type === 'date' ? (
                            <input
                              type="date"
                              value={applicantDynamicDetails[detail.key] || ''}
                              onChange={e => setApplicantDynamicDetails(prev => ({ ...prev, [detail.key]: e.target.value }))}
                              style={{ width: '100%' }}
                            />
                          ) : detail.type === 'number' ? (
                            <input
                              type="number"
                              value={applicantDynamicDetails[detail.key] || ''}
                              onChange={e => setApplicantDynamicDetails(prev => ({ ...prev, [detail.key]: e.target.value }))}
                              style={{ width: '100%' }}
                            />
                          ) : detail.type === 'select' ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                              {detail.options && detail.options.split(',').map((option, idx) => (
                                <label key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                  <input
                                    type="radio"
                                    name={`dynamic-${detail.key}`}
                                    value={option.trim()}
                                    checked={applicantDynamicDetails[detail.key] === option.trim()}
                                    onChange={e => {
                                      const newValue = e.target.value;
                                      if (applicantDynamicDetails[detail.key] === newValue) {
                                        setApplicantDynamicDetails(prev => ({ ...prev, [detail.key]: null }));
                                      } else {
                                        setApplicantDynamicDetails(prev => ({ ...prev, [detail.key]: newValue }));
                                      }
                                    }}
                                  />
                                  {option.trim()}
                                </label>
                              ))}
                            </div>
                          ) : (
                            <input
                              type="text"
                              value={applicantDynamicDetails[detail.key] || ''}
                              onChange={e => setApplicantDynamicDetails(prev => ({ ...prev, [detail.key]: e.target.value }))}
                              style={{ width: '100%' }}
                            />
                          )
                        ) : (
                          <span>
                            {detail.type === 'checkbox'
                              ? (applicantDynamicDetails[detail.key] === 'true' ? '✅' : '❌')
                              : (applicantDynamicDetails[detail.key] || <em>Not set</em>)}
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </>
  );
}
