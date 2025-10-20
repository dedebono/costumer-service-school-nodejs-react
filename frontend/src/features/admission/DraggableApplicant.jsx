import { useDraggable } from '@dnd-kit/core';
import { formatDate } from '../../lib/utils';

export default function DraggableApplicant({ applicant, onClick }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useDraggable({ id: applicant.id });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.15 : 1,  // dims only while dragging
    cursor: 'grab'
  };

  const handleClick = (e) => {
    // If it's not dragging, treat as a simple click to open details
    if (!isDragging) onClick?.(applicant);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="card"
      onClick={handleClick}
    >
      <div className="card__title">
        {applicant.name} {applicant.nisn && <span className="badge">{applicant.parent_phone}</span>}
      </div>
      {applicant.email && <div className="card__meta">{applicant.email}</div>}
      {applicant.address && <div className="card__meta">{applicant.address}</div>}
      {applicant.nisn && <div className="card__meta">NISN: {applicant.nisn}</div>}
      {applicant.birthdate && <div className="card__meta">Tanggal Lahir: {formatDate(applicant.birthdate)}</div>}
      {applicant.notes && <div className="badge">{applicant.notes}</div>}

    </li>
  );
}
