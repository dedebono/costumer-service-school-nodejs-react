import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export default function SortableItem({ id, step }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <div style={{ padding: 8, border: '1px solid #ccc', marginBottom: 4, background: '#f9f9f9' }}>
        {step.title} - {step.slug} {step.is_final ? '(Final)' : ''}
      </div>
    </li>
  );
}
