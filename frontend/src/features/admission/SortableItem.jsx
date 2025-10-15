// SortableItem.jsx - Now a simple item without drag-and-drop
export default function SortableItem({ step, onStepClick, onDelete }) {
  const handleClick = () => {
    onStepClick?.(step);
  };

  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete?.(step.id);
  };

  return (
    <li>
<div
  className="liststeps"
  onClick={handleClick}
  style={{
    cursor: 'pointer',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  }}
>
  <span>
    {step.title} - {step.slug} {step.is_final ? '(Final)' : ''}
  </span>
  <button
    className="btn-delete"
    onClick={handleDelete}
    style={{
      color: 'red',
      border: 'none',
      background: 'none',
      cursor: 'pointer',
      fontSize: '1.2rem',
    }}
  >
    ❌
  </button>
</div>
    </li>
  );
}
