// src/features/tickets/TicketDetails.jsx
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import { api } from '../../lib/api.js';
import { fmtDate } from '../../lib/utils.js';

export default function TicketDetails({
  ticketId,
  initialTicket = null,
  onClose,
  onFollowUp,       // () => void
  onCloseTicket,    // async (ticket) => { ok, error? }
}) {
  const [ticket, setTicket] = useState(initialTicket);
  const [loading, setLoading] = useState(!initialTicket);
  const [closing, setClosing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      if (!ticketId) return;
      setLoading(true);
      setError('');
      try {
        const data = await api(`/api/tickets/${ticketId}`);
        if (active) setTicket(data);
      } catch (e) {
        if (active) setError(e?.message || 'Failed to load ticket');
      } finally {
        if (active) setLoading(false);
      }
    }
    if (!initialTicket) load();
    return () => { active = false; };
  }, [ticketId, initialTicket]);

  async function handleCloseTicket() {
    if (!ticket) return;
    if ((ticket.status || '').toLowerCase() === 'closed') {
      await Swal.fire({ icon: 'info', title: 'Already closed', text: `Ticket ${ticket.id} is already closed.` });
      return;
    }

    const res = await Swal.fire({
      icon: 'warning',
      title: 'Close this ticket?',
      html: `<div style="text-align:left"><b>ID:</b> ${ticket.id}<br/><b>Title:</b> ${ticket.title || '-'}</div>`,
      showCancelButton: true,
      confirmButtonText: 'Yes, close it',
      cancelButtonText: 'Cancel',
    });
    if (!res.isConfirmed) return;

    try {
      setClosing(true);
      const result = await onCloseTicket?.(ticket);
      if (result?.ok) {
        await Swal.fire({ icon: 'success', title: 'Ticket closed', timer: 900, showConfirmButton: false });
        setTicket((t) => ({ ...t, status: 'closed' }));
      } else {
        await Swal.fire({ icon: 'error', title: 'Failed to close', text: result?.error || 'Unknown error' });
      }
    } finally {
      setClosing(false);
    }
  }

  if (loading) return <div style={box}>Loading…</div>;
  if (error)   return <div style={{ ...box, color: '#b91c1c' }}>Error: {error}</div>;
  if (!ticket) return <div style={box}>Ticket not found.</div>;

  const isClosed = (ticket.status || '').toLowerCase() === 'closed';

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={row}>
        <div style={{ fontWeight: 700, fontSize: 16 }}>{ticket.title || '-'}</div>
        <span style={badge(ticket.status)}>{ticket.status}</span>
      </div>

      <div style={meta}>
        <div><b>ID:</b> {ticket.id}</div>
        <div><b>Priority:</b> {ticket.priority || '-'}</div>
        <div><b>Customer:</b> {ticket.customer_name || '-'} {ticket.customer_phone ? `• ${ticket.customer_phone}` : ''}</div>
        <div><b>Creator:</b> {ticket.created_by_username ?? ticket.created_by ?? '-'}</div>
        <div><b>Created:</b> {fmtDate(ticket.created_at)}</div>
        <div><b>Updated:</b> {fmtDate(ticket.updated_at)}</div>
      </div>

      <div>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Description</div>
        <pre style={pre}>{ticket.description || '-'}</pre>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onClose} style={btn}>Close</button>
        <button
          onClick={handleCloseTicket}
          style={isClosed ? btnDisabled : btnDanger}
          disabled={isClosed || closing}
          title={isClosed ? 'Already closed' : 'Mark this ticket as closed'}
        >
          {closing ? 'Closing…' : 'Close Ticket'}
        </button>
        <button
          onClick={onFollowUp}
          style={isClosed ? btnDisabled : btnPrimary}
          disabled={isClosed}
          title={isClosed ? 'This ticket is closed; follow-up is not allowed.' : 'Create a follow-up ticket'}
        >
          Follow Up → Create New Ticket
        </button>
      </div>
    </div>
  );
}

/* — styles (scoped to this file) — */
const box = { padding: 12, border: '1px solid #eee', borderRadius: 8, background: '#fff' };
const row = { display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between' };
const meta = { display: 'grid', gap: 4, fontSize: 13, color: '#374151' };
const pre = {
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
  border: '1px solid #eee',
  borderRadius: 8,
  padding: 10,
  background: '#fafafa',
  margin: 0,
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  fontSize: 13,
};

const btn = { padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer' };
const btnPrimary = { padding: '8px 12px', borderRadius: 8, background: '#111', color: '#fff', border: 'none', cursor: 'pointer' };
const btnDisabled = { ...btnPrimary, background: '#9ca3af', cursor: 'not-allowed' };
const btnDanger = { padding: '8px 12px', borderRadius: 8, background: '#b91c1c', color: '#fff', border: 'none', cursor: 'pointer' };

function badge(status) {
  const base = { padding: '2px 8px', borderRadius: 999, fontSize: 12, textTransform: 'capitalize' };
  switch ((status || '').toLowerCase()) {
    case 'open':         return { ...base, background: '#ecfeff', color: '#155e75', border: '1px solid #a5f3fc' };
    case 'in_progress':  return { ...base, background: '#fef9c3', color: '#854d0e', border: '1px solid #fde68a' };
    case 'resolved':     return { ...base, background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' };
    case 'closed':       return { ...base, background: '#e5e7eb', color: '#374151', border: '1px solid #d1d5db' };
    default:             return { ...base, background: '#f3f4f6', color: '#374151', border: '1px solid #e5e7eb' };
  }
}
