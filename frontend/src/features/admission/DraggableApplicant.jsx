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
      <div className='card_title'>{applicant.name}
      </div>
      {applicant.parent_phone && <div className="card__meta">📞{applicant.parent_phone}</div>}
      {applicant.birthdate && <div className="card__meta">🎂{formatDate(applicant.birthdate)}</div>}
      {applicant.address && <div 
       style={{maxWidth:'130px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}
      className="card__meta">🏠{applicant.address}</div>}
      {applicant.email && <div 
      style={{maxWidth:'130px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}
      className="card__meta">📧{applicant.email}</div>}
      {applicant.notes && <div
      className="card__meta"
      style={{maxWidth:'130px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}
      >✒️{applicant.notes}</div>}
      {applicant.nisn && <div className="card__meta"> 📋{applicant.nisn}</div>}
    </li>
  );
}
