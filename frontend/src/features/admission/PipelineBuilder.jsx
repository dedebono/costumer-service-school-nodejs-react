import { useState, useEffect, useMemo } from 'react';
import { api } from '../../lib/api.js';
import {
  DndContext,
  closestCenter,
  DragOverlay
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove
} from '@dnd-kit/sortable';
import SortableItem from './SortableItem.jsx';

// Simple reusable modal
function Modal({ open, title, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="modal-overlay">
      <div className="modal">
        <header className="modal-header">
          <h3>{title}</h3>
          <button className="btn-close" onClick={onClose}>✖</button>
        </header>
        <div className="modal-body">{children}</div>
        {footer && <footer className="modal-footer">{footer}</footer>}
      </div>
    </div>
  );
}

export default function PipelineBuilder({ pipelineId, hideAddStep = false }) {
  const [steps, setSteps] = useState([]);
  const [newStepName, setNewStepName] = useState('');
  const [newStepSlug, setNewStepSlug] = useState('');
  const [isFinal, setIsFinal] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const [activeId, setActiveId] = useState(null);
  const activeStep = useMemo(
    () => steps.find((s) => s.id === activeId) || null,
    [activeId, steps]
  );

  const [selectedStep, setSelectedStep] = useState(null);

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

  const onDragStart = ({ active }) => setActiveId(active.id);
  const onDragCancel = () => setActiveId(null);

  const onDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;

    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(steps, oldIndex, newIndex).map((s, i) => ({
      ...s,
      ord: i + 1,
    }));

    const prev = steps;
    setSteps(reordered);

    try {
      await api(`/admission/${pipelineId}/steps`, {
        method: 'PUT',
        body: { steps: reordered },
      });
    } catch (err) {
      console.error('Failed to update steps:', err);
      setSteps(prev); // rollback on error
    }
  };

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

  return (
    <div>
      {!hideAddStep && (
        <>
          <h3>Add New Step</h3>
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
              Add Step
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
      </div>

      {!isCollapsed && (
        <DndContext
          collisionDetection={closestCenter}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragCancel={onDragCancel}
        >
          <SortableContext
            items={steps.map((s) => s.id)}
            strategy={horizontalListSortingStrategy}
          >
            <ul className="steps-list">
              {steps.map((s) => (
                <SortableItem
                  key={s.id}
                  id={s.id}
                  step={s}
                  onStepClick={setSelectedStep}
                />
              ))}
            </ul>
          </SortableContext>

          <DragOverlay dropAnimation={null}>
            {activeStep ? (
              <div className="liststeps">
                {activeStep.title} - {activeStep.slug}{' '}
                {activeStep.is_final ? '(Final)' : ''}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* 🔥 Step detail modal */}
      <Modal
        open={!!selectedStep}
        title="Step Details"
        onClose={() => setSelectedStep(null)}
        footer={
          <button
            className="btn btn--primary"
            onClick={() => setSelectedStep(null)}
          >
            Close
          </button>
        }
      >
        {selectedStep && (
          <div>
            <p><strong>Title:</strong> {selectedStep.title}</p>
            <p><strong>Slug:</strong> {selectedStep.slug}</p>
            <p><strong>Order:</strong> {selectedStep.ord}</p>
            <p><strong>Is Final:</strong> {selectedStep.is_final ? 'Yes' : 'No'}</p>
          </div>
        )}
      </Modal>

      <div className="mt-4">
        <button className="btnsimpan" 
        disabled
        onClick={() => alert('All changes have been auto-saved.')}>
          Simpan
        </button>
      </div>
    </div>
  );
}
