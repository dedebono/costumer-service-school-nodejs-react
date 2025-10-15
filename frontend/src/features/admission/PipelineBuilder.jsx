import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import Swal from 'sweetalert2';
import SortableItem from './SortableItem.jsx';

export default function PipelineBuilder({ pipelineId, hideAddStep = false, onPipelineDuplicated }) {
  const [steps, setSteps] = useState([]);
  const [newStepName, setNewStepName] = useState('');
  const [newStepSlug, setNewStepSlug] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const [selectedStep, setSelectedStep] = useState(null);

  const handleStepClick = (step) => {
    Swal.fire({
      title: 'Step Details',
      html: `
        <p><strong>Title:</strong> ${step.title}</p>
        <p><strong>Slug:</strong> ${step.slug}</p>
        <p><strong>Order:</strong> ${step.ord}</p>
        <p><strong>Is Final:</strong> ${step.is_final ? 'Yes' : 'No'}</p>
      `,
      confirmButtonText: 'Close'
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        const p = await api(`/admission/pipelines/${pipelineId}`);
        setSteps((p.steps || []).sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0)));
      } catch (e) {
        console.error('Failed to load pipeline:', e);
      }
    };
    load();
  }, [pipelineId]);



  const handleAddStep = async () => {
    if (!newStepName || !newStepSlug) {
      alert('Step name and slug are required');
      return;
    }
    try {
      const created = await api(`/admission/${pipelineId}/steps`, {
        method: 'POST',
        body: { name: newStepName, slug: newStepSlug, is_final: isFinal },
      });
      setSteps((cur) =>
        [...cur, created].sort((a, b) => (a.ord ?? 0) - (b.ord ?? 0))
      );
      setNewStepName('');
      setNewStepSlug('');
      setIsFinal(false);
    } catch (e) {
      alert('Failed to add step: ' + e.message);
    }
  };

  const handleDuplicatePipeline = async () => {
    const { value: newName } = await Swal.fire({
      title: 'Duplicate Pipeline',
      input: 'text',
      inputLabel: 'Enter new pipeline name',
      inputPlaceholder: 'New Pipeline Name',
      showCancelButton: true,
      inputValidator: (value) => {
        if (!value) {
          return 'You need to enter a name!';
        }
      }
    });

    if (newName) {
      try {
        // Get current pipeline details
        const currentPipeline = await api(`/admission/pipelines/${pipelineId}`);
        // Create new pipeline
        const newPipeline = await api('/admission/pipelines', {
          method: 'POST',
          body: { name: newName, year: currentPipeline.year }
        });
        // Duplicate steps and collect mapping
        const stepMapping = {};
        for (const step of steps) {
          const newStep = await api(`/admission/${newPipeline.id}/steps`, {
            method: 'POST',
            body: { name: step.title, slug: step.slug, is_final: step.is_final }
          });
          stepMapping[step.id] = newStep.id;
        }
        // Duplicate step dynamic details
        for (const step of steps) {
          const details = await api(`/admission/${pipelineId}/steps/${step.id}/details`);
          for (const detail of details) {
            await api(`/admission/${newPipeline.id}/steps/${stepMapping[step.id]}/details`, {
              method: 'POST',
              body: {
                key: detail.key,
                type: detail.type,
                required: detail.required,
                label: detail.label,
                options: detail.options
              }
            });
          }
        }
        Swal.fire('Success', `Pipeline "${newName}" duplicated successfully!`, 'success');
        // Trigger refresh in parent component (Supervisor.jsx)
        if (onPipelineDuplicated) {
          onPipelineDuplicated();
        }
      } catch (e) {
        Swal.fire('Error', 'Failed to duplicate pipeline: ' + e.message, 'error');
      }
    }
  };

  const handleDeleteStep = async (stepId) => {
    const result = await Swal.fire({
      title: 'Are you sure?',
      text: 'This will delete the step and all its details.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!'
    });

    if (result.isConfirmed) {
      try {
        await api(`/admission/${pipelineId}/steps/${stepId}`, { method: 'DELETE' });
        setSteps(steps.filter(s => s.id !== stepId));
        Swal.fire('Deleted!', 'Step has been deleted.', 'success');
      } catch (e) {
        Swal.fire('Error', 'Failed to delete step: ' + e.message, 'error');
      }
    }
  };

  return (
    <div>
      {!hideAddStep && (
        <>
          <h3>Tambahkan Langkah</h3>
          <div className="flex gap-2 mb-2">
            <input
              className="input-modal"
              type="text"
              placeholder="Step Name"
              value={newStepName}
              onChange={(e) => setNewStepName(e.target.value)}
            />
            <input
              className="input-modal"
              type="text"
              placeholder="Step Slug"
              value={newStepSlug}
              onChange={(e) => setNewStepSlug(e.target.value)}
            />
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={isFinal}
                onChange={(e) => setIsFinal(e.target.checked)}
              />
              Final
            </label>
            <button className="btn btn--primary" onClick={handleAddStep}>
              Tambah
            </button>
          </div>
        </>
      )}

      <div className="flex items-center gap-2 mt-4">
        <h3>Alur PMB</h3>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="btn btn--subtle btn--sm"
        >
          {isCollapsed ? 'Lihat' : 'Sembunyi'}
        </button>
        <button className="btn btn--primary" onClick={handleDuplicatePipeline}>
          Gandakan Alur
        </button>

      </div>

      {!isCollapsed && (
        <ul className="steps-list">
          {steps.map((s) => (
            <SortableItem
              key={s.id}
              step={s}
              onStepClick={handleStepClick}
              onDelete={handleDeleteStep}
            />
          ))}
        </ul>
      )}



      <div className="mt-4 flex gap-2">
        <button className="btnsimpan"
        disabled
        onClick={() => alert('All changes have been auto-saved.')}>
          Simpan
        </button>
      </div>
    </div>
  );
}
