// src/features/customers/FetchUser.jsx
import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import Swal from 'sweetalert2';

export default function FetchUser() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(false);

  // Search fields
  const [qName, setQName] = useState('');
  const [qEmail, setQEmail] = useState('');
  const [qPhone, setQPhone] = useState('');
  const [phoneErr, setPhoneErr] = useState('');

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPhoneErr, setEditPhoneErr] = useState('');

  // Helpers
  const normalizePhone = (val) => (val || '').replace(/\D/g, '').slice(0, 12);
  const isValidPhone = (val) => !val || /^\d{11,12}$/.test(val); // optional, but if present: 11–12 digits
  const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val || '');

  // Load all customers
  async function loadAll() {
    setLoading(true);
    try {
      const data = await api('/api/customers');
      setCustomers(Array.isArray(data) ? data : []);
      if (!data?.length) {
        await Swal.fire({ icon: 'info', title: 'No customers', text: 'No customers found.' });
      }
    } catch (e) {
      await Swal.fire({ icon: 'error', title: 'Fetch error', text: e.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Search
  async function handleSearch() {
    setPhoneErr('');
    const phone = qPhone.trim();
    if (phone && !isValidPhone(phone)) {
      setPhoneErr('Phone must be 11–12 digits.');
      await Swal.fire({ icon: 'error', title: 'Invalid phone', text: 'Phone must be 11–12 digits.' });
      return;
    }
    if (!qName.trim() && !qEmail.trim() && !phone) {
      await Swal.fire({
        icon: 'info',
        title: 'Nothing to search',
        text: 'Enter name, email, or an 11–12 digit phone number.',
      });
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (qName.trim()) params.append('name', qName.trim());
      if (qEmail.trim()) params.append('email', qEmail.trim());
      if (phone) params.append('phone', phone);

      const data = await api(`/api/customers/search?${params.toString()}`);
      setCustomers(Array.isArray(data) ? data : []);
      if (!data?.length) {
        await Swal.fire({ icon: 'warning', title: 'No results', text: 'No customers matched your search.' });
      }
    } catch (e) {
      await Swal.fire({ icon: 'error', title: 'Search error', text: e.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  }

  function handleSearchEnter(e) {
    if (e.nativeEvent?.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      handleSearch();
    }
  }

  function clearSearch() {
    setQName('');
    setQEmail('');
    setQPhone('');
    setPhoneErr('');
    loadAll();
  }

  // Edit
  function openEdit(c) {
    setEditId(c.id);
    setEditName(c.name || '');
    setEditEmail(c.email || '');
    setEditPhone((c.phone || '').toString());
    setEditPhoneErr('');
    setEditOpen(true);
  }
  function closeEdit() {
    setEditOpen(false);
    setEditId(null);
  }

  async function saveEdit(e) {
    e.preventDefault();
    const name = editName.trim();
    const email = editEmail.trim().toLowerCase();
    const phone = normalizePhone(editPhone);

    if (!name) {
      await Swal.fire({ icon: 'error', title: 'Missing field', text: 'Name is required.' });
      return;
    }
    if (!email || !isValidEmail(email)) {
      await Swal.fire({ icon: 'error', title: 'Invalid email', text: 'Please provide a valid email.' });
      return;
    }
    if (!isValidPhone(phone)) {
      setEditPhoneErr('Phone must be 11–12 digits.');
      await Swal.fire({ icon: 'error', title: 'Invalid phone', text: 'Phone must be 11–12 digits.' });
      return;
    }

    try {
      await api(`/api/customers/${editId}`, {
        method: 'PATCH',
        body: { name, email, phone: phone || null },
      });
      await Swal.fire({ icon: 'success', title: 'Customer updated' });
      closeEdit();
      // refresh list (optimistic alternative: update in place)
      await handleSearchOrReload();
    } catch (e2) {
      await Swal.fire({
        icon: 'error',
        title: 'Update failed',
        text: e2?.response?.data?.error || e2.message || 'Unknown error',
      });
    }
  }

  async function handleSearchOrReload() {
    if (qName.trim() || qEmail.trim() || qPhone.trim()) {
      await handleSearch();
    } else {
      await loadAll();
    }
  }

  // Delete
  async function deleteCustomer(c) {
    const res = await Swal.fire({
      icon: 'warning',
      title: 'Delete this customer?',
      html: `<div style="text-align:left"><b>${c.name}</b><br/>${c.email || '-'}<br/>${c.phone || '-'}</div>`,
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel',
      showCancelButton: true,
      confirmButtonColor: '#b91c1c',
    });
    if (!res.isConfirmed) return;

    try {
      await api(`/api/customers/${c.id}`, { method: 'DELETE' });
      await Swal.fire({ icon: 'success', title: 'Customer deleted' });
      // remove locally
      setCustomers((curr) => curr.filter((x) => x.id !== c.id));
    } catch (e) {
      await Swal.fire({
        icon: 'error',
        title: 'Delete failed',
        text: e?.response?.data?.error || e.message || 'Unknown error',
      });
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h2>Customers</h2>

      {/* Search bar */}
      <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <div style={{ display: 'grid', gap: 6 }}>
          <label>Name</label>
          <input
            style={inp}
            value={qName}
            onChange={(e) => setQName(e.target.value)}
            onKeyDown={handleSearchEnter}
            placeholder="Jane Doe"
          />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label>Email</label>
          <input
            style={inp}
            value={qEmail}
            onChange={(e) => setQEmail(e.target.value)}
            onKeyDown={handleSearchEnter}
            placeholder="jane@example.com"
            type="email"
          />
        </div>
        <div style={{ display: 'grid', gap: 6 }}>
          <label>Phone (11–12 digits)</label>
          <input
            style={inp}
            value={qPhone}
            onChange={(e) => setQPhone(normalizePhone(e.target.value))}
            onKeyDown={handleSearchEnter}
            inputMode="numeric"
            maxLength={12}
            placeholder="08xxxxxxxxxx"
            aria-invalid={!!phoneErr}
          />
          {phoneErr && <span style={errorText}>{phoneErr}</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button onClick={handleSearch} style={btnPrimary}>Search</button>
        <button onClick={clearSearch} style={btn}>Clear & Reload</button>
      </div>

      {/* Table */}
      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: 12, minWidth: 640 }}>
          <thead style={{ background: '#f3f4f6', textAlign: 'left' }}>
            <tr>
              <th style={th}>Name</th>
              <th style={th}>Email</th>
              <th style={th}>Phone</th>
              <th style={{ ...th, width: 180 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td style={td} colSpan={4}>Loading…</td></tr>
            ) : customers.length === 0 ? (
              <tr><td style={td} colSpan={4}>No customers found</td></tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{c.name}</td>
                  <td style={td}>{c.email}</td>
                  <td style={td}>{c.phone || '-'}</td>
                  <td style={td}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <button onClick={() => openEdit(c)} style={btn}>Edit</button>
                      <button onClick={() => deleteCustomer(c)} style={btnDanger}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Edit Modal */}
      {editOpen && (
        <Modal title="Edit Customer" onClose={closeEdit}>
          <form onSubmit={saveEdit}>
            <div style={{ display: 'grid', gap: 8 }}>
              <label>Full Name</label>
              <input style={inp} value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus />

              <label>Email</label>
              <input style={inp} type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} />

              <label>Phone (11–12 digits)</label>
              <input
                style={inp}
                value={editPhone}
                onChange={(e) => {
                  const v = normalizePhone(e.target.value);
                  setEditPhone(v);
                  if (!isValidPhone(v)) setEditPhoneErr('Phone must be 11–12 digits.');
                  else setEditPhoneErr('');
                }}
                inputMode="numeric"
                maxLength={12}
                placeholder="08xxxxxxxxxx"
                aria-invalid={!!editPhoneErr}
              />
              {editPhoneErr && <span style={errorText}>{editPhoneErr}</span>}
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={closeEdit} style={btn}>Cancel</button>
              <button type="submit" style={btnPrimary}>Save</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

/** Simple Modal */
function Modal({ title, children, onClose }) {
  return (
    <div style={modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={onClose}>
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 id="modal-title" style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={btn}>×</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

// styles
const th = { padding: 8 };
const td = { padding: 8, verticalAlign: 'top' };
const inp = { border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px' };
const btn = { padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' };
const btnPrimary = { padding: '8px 10px', borderRadius: 8, background: '#111', color: '#fff', border: 'none', cursor: 'pointer' };
const btnDanger = { padding: '8px 10px', borderRadius: 8, background: '#b91c1c', color: '#fff', border: 'none', cursor: 'pointer' };
const errorText = { color: '#b91c1c', fontSize: 12, marginTop: -4, marginBottom: 8 };
const modalBackdrop = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000
};
const modalCard = {
  background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16,
  width: 'min(520px, 100%)', boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
};