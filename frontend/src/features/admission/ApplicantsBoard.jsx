import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import {
  DndContext,
  rectIntersection,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import StepColumn from './StepColumn.jsx';

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

  // Drag overlay state
  const [activeId, setActiveId] = useState(null);
  const activeItem =
    activeId &&
    columns.flatMap(c => c.items).find(a => a.id === activeId);

  // Click-to-open modal state
  const [selectedApplicant, setSelectedApplicant] = useState(null);

  // Sensors: small distance to distinguish click vs drag
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    setColumns((pipeline.steps || []).sort((a, b) => a.ord - b.ord).map(s => ({ step: s, items: [] })));
  }, [pipeline.steps]);

  useEffect(() => {
    const load = async () => {
      try {
        const list = await api(`/api/admission/applicants?pipelineId=${pipeline.id}`);
        setColumns(cols => cols.map(c => ({
          ...c, items: list.filter(a => a.current_step_id === c.step.id)
        })));
      } catch (e) {
        console.error('Failed to load applicants:', e);
      }
    };
    if (pipeline.steps && pipeline.steps.length > 0) load();
  }, [pipeline.id, pipeline.steps]);

  const onDragStart = ({ active }) => setActiveId(active.id);

  const onDragEnd = async ({ active, over }) => {
    setActiveId(null);
    if (!over) return;
    const applicantId = active.id;
    const toStepId = over.id;

    setColumns(cols => {
      const fromIdx = cols.findIndex(c => c.items.some(i => i.id === applicantId));
      const toIdx = cols.findIndex(c => c.step.id === toStepId);
      if (fromIdx === -1 || toIdx === -1) return cols;
      const item = cols[fromIdx].items.find(i => i.id === applicantId);
      return cols.map((c, i) => ({
        ...c,
        items: i === fromIdx ? c.items.filter(i => i.id !== applicantId)
             : i === toIdx   ? [item, ...c.items]
             : c.items
      }));
    });

    try {
      await api(`/api/admission/${applicantId}/move`, {
        method: 'POST',
        body: { toStepId }
      });
    } catch (e) {
      alert(`Failed to move: ${e.message}`);
    }
  };

  const onDragCancel = () => setActiveId(null);

  // Click handler to open modal with details
  const handleApplicantClick = (applicant) => {
    setSelectedApplicant(applicant);
  };

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragCancel={onDragCancel}
        collisionDetection={rectIntersection}
      >
        <div style={{ display: 'flex', flexDirection:'row', gap: 16, overflowX: 'auto', width: '100%', paddingTop: 16, paddingBottom: 16, boxSizing: 'border-box' }}>
          {columns.map(col => (
            <StepColumn
              key={col.step.id}
              step={col.step}
              items={col.items}
              onApplicantClick={handleApplicantClick}
            />
          ))}
        </div>

        {/* Dragged card overlay */}
        <DragOverlay dropAnimation={null}>
          {activeItem ? (
            <li className="card is-dragging-overlay">
              <div className="card__title">
                {activeItem.name} {activeItem.nisn && <span className="badge">{activeItem.nisn}</span>}
              </div>
              <div className="card__meta">{activeItem.parent_phone}</div>
              <div className="card__meta">{activeItem.email}</div>
            </li>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Applicant details modal */}
      <Modal
        open={!!selectedApplicant}
        title="Applicant Details"
        onClose={() => setSelectedApplicant(null)}
        footer={
          <button className="btn btn--primary" onClick={() => setSelectedApplicant(null)}>
            Close
          </button>
        }
      >
        {selectedApplicant && (
          <div className="grid" style={{ gap: '0.5rem' }}>
            <div><strong>Name:</strong> {selectedApplicant.name}</div>
            {selectedApplicant.nisn && <div><strong>NISN:</strong> {selectedApplicant.nisn}</div>}
            {selectedApplicant.birthdate && <div><strong>Birthdate:</strong> {selectedApplicant.birthdate}</div>}
            {selectedApplicant.parent_phone && <div><strong>Parent Phone:</strong> {selectedApplicant.parent_phone}</div>}
            {selectedApplicant.email && <div><strong>Email:</strong> {selectedApplicant.email}</div>}
            {selectedApplicant.address && <div><strong>Address:</strong> {selectedApplicant.address}</div>}
          </div>
        )}
      </Modal>
    </>
  );
}
