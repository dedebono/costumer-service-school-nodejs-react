// SortableItem.jsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SortableItem({ id, step, onStepClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: 'grab',
  };

  const handleClick = (e) => {
    // Prevent triggering drag if just a click
    if (!isDragging) {
      onStepClick?.(step);
    }
  };

  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div className="liststeps" onClick={handleClick}>
        {step.title} - {step.slug} {step.is_final ? '(Final)' : ''}
      </div>
    </li>
  );
}
