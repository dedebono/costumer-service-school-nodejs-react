// src/components/Modal.jsx
import { useEffect, useRef } from 'react';

export default function Modal({ open, title, onClose, children, footer }) {
  const dialogRef = useRef(null);

  // Tutup dengan ESC
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  // Lock scroll body saat modal buka
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Fokus awal ke dialog
  useEffect(() => {
    if (open && dialogRef.current) dialogRef.current.focus();
  }, [open]);

  return (
    <div className="modal" {...(open ? { 'data-open': '' } : {})}>
      <div className="modal__backdrop" onClick={onClose} />
      <div
        ref={dialogRef}
        className="modal__dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h3 id="modal-title" className="m-0">{title}</h3>
          <button className="btn btn--ghost modal__close" aria-label="Close" onClick={onClose}>✕</button>
        </header>
        <div className="modal__body">{children}</div>
        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>
  );
}
