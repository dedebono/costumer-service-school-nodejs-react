import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import SortableItem from './SortableItem.jsx';

export default function PipelineBuilder({ pipelineId, hideAddStep = false }) {
  const [steps, setSteps] = useState([]);
  const [newStepName, setNewStepName] = useState('');
  const [newStepSlug, setNewStepSlug] = useState('');
  const [isFinal, setIsFinal] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const p = await api(`/api/admission/pipelines/${pipelineId}`);
        setSteps(p.steps || []);
      } catch (e) {
        console.error('Failed to load pipeline:', e);
      }
    };
    load();
  }, [pipelineId]);

  const onDragEnd = async (e) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex(s => s.id === active.id);
    const newIndex = steps.findIndex(s => s.id === over.id);
    const newSteps = arrayMove(steps, oldIndex, newIndex).map((s, i) => ({ ...s, ord: i + 1 }));
    setSteps(newSteps);
    // Simpan ke server
    try {
      await api(`/api/admission/${pipelineId}/steps`, {
        method: 'PUT',
        body: { steps: newSteps }
      });
    } catch (e) {
      console.error('Failed to update steps:', e);
    }
  };

  const handleAddStep = async () => {
    if (!newStepName || !newStepSlug) {
      alert('Step name and slug are required');
      return;
    }
    try {
      const newStep = await api(`/api/admission/${pipelineId}/steps`, {
        method: 'POST',
        body: { name: newStepName, slug: newStepSlug, is_final: isFinal }
      });
      setSteps([...steps, newStep]);
      setNewStepName('');
      setNewStepSlug('');
      setIsFinal(false);
    } catch (e) {
      alert('Failed to add step: ' + e.message);
    }
  };

  return (
    <div>
      {!hideAddStep && (
        <>
          <h3>Add New Step</h3>
          <input
            type="text"
            placeholder="Step Name"
            value={newStepName}
            onChange={e => setNewStepName(e.target.value)}
          />
          <input
            type="text"
            placeholder="Step Slug"
            value={newStepSlug}
            onChange={e => setNewStepSlug(e.target.value)}
          />
          <label>
            <input
              type="checkbox"
              checked={isFinal}
              onChange={e => setIsFinal(e.target.checked)}
            />
            Is Final Step
          </label>
          <button onClick={handleAddStep}>Add Step</button>
        </>
      )}

      <h3>Existing Steps (Drag to Reorder)</h3>
      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={steps.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {steps.map(s => <SortableItem key={s.id} id={s.id} step={s} />)}
          </ul>
        </SortableContext>
      </DndContext>
    </div>
  );
}
