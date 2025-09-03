// src/features/tickets/TicketCreate.jsx
import { useState } from 'react';
import { api } from '../../lib/api.js';

export default function TicketCreate() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // DB allows: low | medium | high | urgent
  const [priority, setPriority] = useState('medium');
  // DB allows: open | in_progress | resolved | closed
  const [status, setStatus] = useState('open');

  // customer search/create
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [creatingCustomer, setCreatingCustomer] = useState(false);

  const [success, setSuccess] = useState(false);
  const [createdTicket, setCreatedTicket] = useState(null);
  const [msg, setMsg] = useState('');

  async function searchCustomers() {
    setMsg('');
    try {
      const params = new URLSearchParams();
      if (name) params.append('name', name);
      if (phone) params.append('phone', phone);
      const data = await api(`/api/customers/search?${params.toString()}`);
      setSearchResults(data);
      setSelectedCustomer(null);
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
  }

  async function createCustomer() {
    setMsg('');
    try {
      if (!name || !email) {
        setMsg('Name and email are required to create a customer');
        return;
      }
      const cust = await api('/api/customers', {
        method: 'POST',
        body: { name, email, phone },
      });
      setSelectedCustomer(cust);
      setSearchResults([cust, ...searchResults]);
      setCreatingCustomer(false);
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
  }

  async function submit(e) {
    e.preventDefault();
    setMsg('');
    setSuccess(false);
    try {
      const body = { title, description, priority, status }; // ← include status
      if (selectedCustomer?.id) body.customerId = selectedCustomer.id;

      const data = await api('/api/tickets', { method: 'POST', body });
      setCreatedTicket(data);
      setSuccess(true);

      // reset for next entry
      setTitle('');
      setDescription('');
      setPriority('medium');
      setStatus('open');
      // keep selected customer if you want, or clear:
      // setSelectedCustomer(null);
    } catch (e) {
      setMsg(`Error: ${e.message}`);
    }
  }

  if (success) {
    return (
      <div style={{ background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 24, textAlign: 'center' }}>
        <h3 style={{ marginTop: 0 }}>Ticket Created 🎉</h3>
        <p style={{ color: '#555' }}>ID: {createdTicket?.id ?? '(check list)'}</p>
        <button onClick={() => setSuccess(false)} style={btnPrimary}>Create Another</button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ maxWidth: 720, background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16 }}>
      <h3 style={{ marginTop: 0 }}>Create New Ticket</h3>

      {/* Customer flow */}
      <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
        <label>Customer Name</label>
        <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Jane Doe" />
        <label>Customer Phone</label>
        <input style={inp} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="08xxxxxxxxxx" />
        <label>Email (for new customer)</label>
        <input style={inp} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="jane@example.com" />
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" onClick={searchCustomers} style={btnPrimary}>Search Customer</button>
          <button type="button" onClick={() => setCreatingCustomer(true)} style={btn}>Create New Customer</button>
        </div>
      </div>

      {creatingCustomer && (
        <div style={{ background: '#fafafa', border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>New Customer</div>
          <div style={{ display: 'grid', gap: 8 }}>
            <label>Name</label>
            <input style={inp} value={name} onChange={(e) => setName(e.target.value)} />
            <label>Email</label>
            <input style={inp} value={email} onChange={(e) => setEmail(e.target.value)} />
            <label>Phone</label>
            <input style={inp} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <button type="button" onClick={createCustomer} style={btnPrimary}>Save Customer</button>
            <button type="button" onClick={() => setCreatingCustomer(false)} style={btn}>Cancel</button>
          </div>
        </div>
      )}

      {searchResults.length > 0 && (
        <div style={{ border: '1px solid #eee', borderRadius: 8, padding: 12, marginBottom: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 8 }}>Search Results</div>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {searchResults.map((c) => (
              <li
                key={c.id}
                onClick={() => setSelectedCustomer(c)}
                style={{
                  padding: 8,
                  borderRadius: 8,
                  cursor: 'pointer',
                  background: selectedCustomer?.id === c.id ? '#e5e7eb' : 'transparent',
                }}
              >
                {c.name} — {c.phone || '-'} <span style={{ color: '#555' }}>({c.email || 'no email'})</span>
              </li>
            ))}
          </ul>
          {selectedCustomer && (
            <div style={{ marginTop: 8, fontSize: 13 }}>
              Selected: <b>{selectedCustomer.name}</b>
            </div>
          )}
        </div>
      )}

      {/* Ticket fields */}
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
        <option>medium</option>
        <option>high</option>
        <option>urgent</option>
      </select>

      <label>Status</label>
      <select style={inp} value={status} onChange={(e) => setStatus(e.target.value)}>
        <option value="open">open</option>
        <option value="in_progress">in_progress</option>
        <option value="resolved">resolved</option>
        <option value="closed">closed</option>
      </select>

      <button style={btnPrimary}>Submit</button>
      {msg && <p style={{ marginTop: 8, fontSize: 14 }}>{msg}</p>}
    </form>
  );
}

const inp = { border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px', marginBottom: 8 };
const btn = { padding: '8px 12px', borderRadius: 8, background: '#fff', border: '1px solid #ddd', cursor: 'pointer' };
const btnPrimary = { padding: '8px 12px', borderRadius: 8, background: '#111', color: '#fff', border: 'none', cursor: 'pointer' };
