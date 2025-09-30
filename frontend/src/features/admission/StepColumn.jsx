import { useDroppable } from '@dnd-kit/core';
import DraggableApplicant from './DraggableApplicant.jsx';

// small stable hash to hue (0..359)
function hueFromId(id) {
  let h = 0; const s = String(id);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

export default function StepColumn({ step, items, onApplicantClick }) {
  const { setNodeRef, isOver } = useDroppable({ id: step.id });
  const hue = hueFromId(step.id);

  return (
    <section
      ref={setNodeRef}
      className={`step ${isOver ? 'is-over' : ''} ${step.is_final ? 'is-final' : ''}`}
      style={{ '--h': hue }}
    >
      <header className="step__header">
        <h3 className="step__title">{step.title}</h3>
        <span className="step__count">{items.length}</span>
      </header>
      <ul className="step__list">
        {items.map(item => (
          <DraggableApplicant
            key={item.id}
            applicant={item}
            onClick={() => onApplicantClick?.(item)}
          />
        ))}
      </ul>
    </section>
  );
}
