// src/features/tickets/TicketSearch.jsx
import { useState } from 'react';
import { api } from '../../lib/api.js';
import { qs, fmtDate } from '../../lib/utils.js';

export default function TicketSearch() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [showFollowUp, setShowFollowUp] = useState(false);

  async function doSearch() {
    // Backend must support q searching against customers.name / customers.phone (already added in model).
    const q = [name, phone].filter(Boolean).join(' ');
    const data = await api(`/api/tickets${qs({ q, page: 1, pageSize: 50 })}`);
    setItems(data.data || []);
    setSelected(null);
    setShowFollowUp(false);
  }

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12 }}>Search by Name</label>
          <input
            style={inp}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Customer name"
          />
        </div>
        <div style={{ flex: 1 }}>
          <label style={{ fontSize: 12 }}>Search by Phone</label>
          <input
            style={inp}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08xxxxxxxxxx"
          />
        </div>
        <button onClick={doSearch} style={btn}>
          Search
        </button>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
        }}
      >
        {items.map((t, i) => (
          <div
            key={t.id ?? `ticket-${i}`}
            style={{
              border: '1px solid #eee',
              borderRadius: 12,
              padding: 12,
              background: '#fff',
              cursor: 'pointer',
              boxShadow: selected?.id === t.id ? '0 0 0 2px #6366f1' : 'none',
            }}
            onClick={() => setSelected(t)}
          >
            <div style={{ fontWeight: 600 }}>{t.title}</div>
            <div style={{ fontSize: 12, color: '#555' }}>
              Status: {t.status} • Priority: {t.priority}
            </div>
            <div style={{ fontSize: 12 }}>
              Customer: <b>{t.customer_name || '-'}</b>{' '}
              {t.customer_phone ? `• ${t.customer_phone}` : ''}
            </div>
            <div style={{ fontSize: 12 }}>
              Creator: {t.created_by_username ?? t.created_by ?? '-'}
            </div>
            <div style={{ fontSize: 11, color: '#666' }}>
              {fmtDate(t.created_at)}
            </div>
          </div>
        ))}
      </div>

      {selected && (
        <div
          style={{
            border: '1px solid #eee',
            borderRadius: 12,
            padding: 16,
            background: '#fff',
          }}
        >
          <h4 style={{ margin: 0, marginBottom: 6 }}>Ticket Details</h4>
          <div style={{ fontSize: 12, color: '#555', marginBottom: 8 }}>
            ID: {selected.id ?? '-'}
          </div>
          <div style={{ marginBottom: 6 }}>
            <b>Customer:</b> {selected.customer_name || '-'}
            {selected.customer_phone ? ` • ${selected.customer_phone}` : ''}
          </div>
          <div style={{ marginBottom: 6 }}>
            <b>Title:</b> {selected.title}
          </div>
          <div style={{ marginBottom: 6 }}>
            <b>Description:</b> {selected.description}
          </div>
          <div style={{ marginBottom: 6 }}>
            Status: {selected.status} • Priority: {selected.priority}
          </div>
          <button onClick={() => setShowFollowUp(true)} style={btnPrimary}>
            Follow Up → Create New Ticket
          </button>
        </div>
      )}

      {showFollowUp && selected && (
        <FollowUpTicket baseTicket={selected} onClose={() => setShowFollowUp(false)} />
      )}
    </div>
  );
}

function FollowUpTicket({ baseTicket, onClose }) {
  // Pre-fill with customer name & phone from the selected ticket
  const customerName = baseTicket.customer_name || '';
  const customerPhone = baseTicket.customer_phone || '';

  const [title, setTitle] = useState(
    `Follow up: ${baseTicket.title}${customerName ? ` — ${customerName}` : ''}`
  );
  const [description, setDescription] = useState(
    `Ref Ticket: ${baseTicket.id ?? '-'}\nCustomer: ${customerName || '-'}\nPhone: ${
      customerPhone || '-'
    }\n\nDetails: `
  );
  const [priority, setPriority] = useState(baseTicket.priority || 'normal');
  const [msg, setMsg] = useState('');

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    try {
      // Always include customerId if available; backend will link the ticket to this customer.
      const body = {
        title,
        description,
        priority,
        // use existing customer from the selected ticket:
        ...(baseTicket.customer_id ? { customerId: baseTicket.customer_id } : {}),
      };
      const data = await (await import('../../lib/api.js')).api('/api/tickets', {
        method: 'POST',
        body,
      });
      setMsg(`Success! New ticket ID: ${data.id || '(check list)'}`);
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
  }

  return (
    <div style={{ border: '1px solid #eee', borderRadius: 12, padding: 16, background: '#fff' }}>
      <h4 style={{ marginTop: 0 }}>Create Follow-up Ticket</h4>
      {/* Read-only customer context */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 8, fontSize: 14 }}>
        <div><b>Customer:</b> {customerName || '-'}</div>
        <div><b>Phone:</b> {customerPhone || '-'}</div>
      </div>

      <form onSubmit={submit} style={{ display: 'grid', gap: 8 }}>
        <label>Title</label>
        <input style={inp} value={title} onChange={(e) => setTitle(e.target.value)} />
        <label>Description</label>
        <textarea
          style={{ ...inp, minHeight: 120 }}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label>Priority</label>
        <select style={inp} value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option>low</option>
          <option>normal</option>
          <option>high</option>
        </select>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={btnPrimary}>Submit</button>
          <button type="button" onClick={onClose} style={btn}>
            Close
          </button>
        </div>
        {msg && <p style={{ fontSize: 13 }}>{msg}</p>}
      </form>
    </div>
  );
}

const inp = { border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px' };
const btn = { padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer' };
const btnPrimary = { padding: '8px 12px', borderRadius: 8, background: '#111', color: '#fff', border: 'none', cursor: 'pointer' };
