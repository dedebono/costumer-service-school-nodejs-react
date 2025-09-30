import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import { DndContext, rectIntersection } from '@dnd-kit/core';
import StepColumn from './StepColumn.jsx';

export default function ApplicantsBoard({ pipeline }) {
  const [columns, setColumns] = useState(() =>
    (pipeline.steps || []).sort((a, b) => a.ord - b.ord).map(s => ({ step: s, items: [] }))
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
    if (pipeline.steps && pipeline.steps.length > 0) {
      load();
    }
  }, [pipeline.id, pipeline.steps]);

  const onDragEnd = async ({ active, over }) => {
    if (!over) return;
    const applicantId = active.id;
    const toStepId = over.id; // over = droppable kolom step
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
    // Konfirmasi ke server
    try {
      await api(`/api/admission/${applicantId}/move`, {
        method: 'POST',
        body: { toStepId }
      });
    } catch (e) {
      alert(`Failed to move: ${e.message}`);
    }
  };

  return (
    <DndContext onDragEnd={onDragEnd} collisionDetection={rectIntersection}>
      <div style={{ display: 'flex', gap: 16, overflowX: 'auto' }}>
        {columns.map(col => (
          <StepColumn key={col.step.id} step={col.step} items={col.items} />
        ))}
      </div>
    </DndContext>
  );
}
