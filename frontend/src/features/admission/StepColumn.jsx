import { useDroppable } from '@dnd-kit/core';
import { useDraggable } from '@dnd-kit/core';

function DraggableApplicant({ applicant }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useDraggable({ id: applicant.id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <div style={{ padding: 4, marginBottom: 4, background: '#fff', border: '1px solid #ddd', cursor: 'grab' }}>
        <div>{applicant.name} ({applicant.nisn})</div>
        <div>{applicant.parent_phone}</div>
        <div>{applicant.email}</div>
      </div>
    </li>
  );
}

export default function StepColumn({ step, items }) {
  const { setNodeRef } = useDroppable({ id: step.id });

  return (
    <div ref={setNodeRef} style={{ minWidth: 200, padding: 8, border: '1px solid #ccc', background: '#fafafa' }}>
      <h3>{step.title}</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map(item => (
          <DraggableApplicant key={item.id} applicant={item} />
        ))}
      </ul>
    </div>
  );
}
