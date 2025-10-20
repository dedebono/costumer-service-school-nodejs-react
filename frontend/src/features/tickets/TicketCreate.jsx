// src/features/tickets/TicketCreate.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import Swal from 'sweetalert2';

export default function TicketCreate() {
  const navigate = useNavigate();
  const location = useLocation();
  const [titleChoice, setTitleChoice] = useState('');
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium'); // low | medium | high | urgent
  const [status, setStatus] = useState('open');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const canSubmitTitle =
    !!titleChoice && (titleChoice !== 'Lain-lain' || customTitle.trim().length > 0);

  const [searchResults, setSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  const [msg, setMsg] = useState('');
  const [phoneError, setPhoneError] = useState('');

  // New Customer regular modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [modalName, setModalName] = useState('');
  const [modalEmail, setModalEmail] = useState('');
  const [modalPhone, setModalPhone] = useState('');
  const [modalPhoneError, setModalPhoneError] = useState('');

  // NEW: Ticket modal state
  const [isTicketOpen, setIsTicketOpen] = useState(false);

  // Store queue ticket data for later use
  const [queueTicketData, setQueueTicketData] = useState(null);

  // ---- NEW: Title & Description options ----
  const TITLE_OPTIONS = [
    'Layanan Kritik dan Saran',
    'Pembelian Seragam',
    'Siswa Pindah Sekolah',
    'Ketertinggalan Picker Card',
    'Menerima Tamu',
    'Lain-lain',
  ];

  const DESCRIPTION_OPTIONS = {
    'Layanan Kritik dan Saran': [
      'Saran',
      'Kritik',
      'Pertanyaan Umum',
      'Edcon mengumpulkan Informasi',
      'Edcon telah menyampaikan ke pihak terkait',
      'Follow up ke Customer',
    ],
    'Pembelian Seragam': [
      'Size terkonfirmasi',
      'EduCS sudah menghubungi GA (Stok)',
      'Fitting Baju',
      'Pembayaran',
      'Pengambilan di EduCS',
    ],
    'Siswa Pindah Sekolah': [
      'Menyampaikan prosedur pindah Sekolah',
      'Konfirmasi ke pihak terkait',
      'Janji temu principal',
      'Telah bertemu principal',
      'Telah mengisi Formulir pindah sekolah',
      'Formulir telah diserahkan ke admin area',
      'Surat Pindah telah diserahkan kepada orang tua',
    ],
    'Ketertinggalan Picker Card': [
      'Mengambil foto penjemput',
      'Menerbitkan Kartu sementara',
      'Menerbitkan Kartu baru (biaya)',
      'Mengalihkan nama siswa ke Dismissal App',
    ],
    'Menerima Tamu Resmi': [
      'Tamu telah mengisi buku tamu',
      'EduCS telah meneruskan informasi ke area',
      'Area telah menghubungi tamu',
    ],
      'Menerima Tamu: Orang tua': [
      'Tamu telah mengisi buku tamu',
      'EduCS telah meneruskan informasi ke area',
      'Area telah menghubungi tamu',
    ],
    'Menerima Tamu: Vendor': [
      'Tamu telah mengisi buku tamu',
      'EduCS telah meneruskan informasi ke area',
      'Area telah menghubungi tamu',
    ],

  };

  const currentDescOptions =
    titleChoice && DESCRIPTION_OPTIONS[titleChoice] ? DESCRIPTION_OPTIONS[titleChoice] : [];

  // NEW: Allow appending extra free text to an option
  const [allowExtraDesc, setAllowExtraDesc] = useState(false);
  const [extraDesc, setExtraDesc] = useState('');

  useEffect(() => {
    if (titleChoice && currentDescOptions.length > 0) {
      setDescription(currentDescOptions[0] || '');
      // reset extra text UI whenever we switch to an option-driven title
      setAllowExtraDesc(false);
      setExtraDesc('');
    } else if (titleChoice === 'Lain-lain') {
      // keep whatever user typed before, or clear it if coming from a select title
      setDescription((prev) => prev || '');
      setAllowExtraDesc(false);
      setExtraDesc('');
    } else {
      setDescription('');
      setAllowExtraDesc(false);
      setExtraDesc('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [titleChoice]);

  // Handle pre-filled data from queue
  useEffect(() => {
    const queueData = sessionStorage.getItem('queueTicketData');
    if (queueData) {
      try {
        const parsedData = JSON.parse(queueData);
        const { name: queueName, phone: queuePhone, email: queueEmail } = parsedData.prefillData;
        setName(queueName || '');
        setPhone(queuePhone || '');
        setEmail(queueEmail || '');
        setQueueTicketData(parsedData);

        if (parsedData.autoSearch && (queueName || queuePhone || queueEmail)) {
          sessionStorage.removeItem('queueTicketData');
          searchCustomers();
        }
      } catch (err) {
        console.error('Error parsing queue ticket data:', err);
      }
    }

    if (location.state?.prefillData) {
      const { name: queueName, phone: queuePhone, email: queueEmail } = location.state.prefillData;
      setName(queueName || '');
      setPhone(queuePhone || '');
      setEmail(queueEmail || '');
      setQueueTicketData(location.state);

      if (location.state.autoSearch && (queueName || queuePhone || queueEmail)) {
        searchCustomers();
      }
    }
  }, [location.state]); // eslint-disable-line react-hooks/exhaustive-deps

  // —— helpers ——
  const normalizePhone = (val) => (val || '').replace(/\D/g, '').slice(0, 12); // keep max at 12
  const isValidPhone = (val) => /^\d{11,12}$/.test(val || '');
  const isValidEmail = (v) =>
    /^[A-Z0-9._%+-]+@(?:[A-Z0-9-]+\.)+[A-Z]{2,}$/i.test((v || '').trim());
  const extractError = (e) =>
    e?.response?.data?.error ||
    e?.response?.data?.message ||
    e?.data?.error ||
    e?.data?.message ||
    e?.message ||
    'Unknown error';

  const showError = (title, text) => Swal.fire({ icon: 'error', title, text });
  const showInfo = (title, text) => Swal.fire({ icon: 'info', title, text });
  const showSuccess = (title, html) => Swal.fire({ icon: 'success', title, html });

  const onPhoneChange = (e) => {
    const normalized = normalizePhone(e.target.value);
    setPhone(normalized);
    if (!normalized) setPhoneError('');
    else if (!isValidPhone(normalized)) setPhoneError('Phone must be 11–12 digits.');
    else setPhoneError('');
  };

  // —— NEW: open regular modal prefilled from current fields ——
  function openCreateCustomerModal() {
    setModalName(name || '');
    setModalEmail(email || '');
    setModalPhone(normalizePhone(phone || ''));
    setModalPhoneError('');
    setIsCreateOpen(true);
  }

  function handleSearchEnter(e) {
    if (e.nativeEvent?.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      searchCustomers();
    }
  }

  function closeCreateCustomerModal() {
    setIsCreateOpen(false);
  }

  function onModalPhoneChange(e) {
    const v = normalizePhone(e.target.value);
    setModalPhone(v);
    if (!v) setModalPhoneError('');
    else if (!isValidPhone(v)) setModalPhoneError('Phone must be 11–12 digits.');
    else setModalPhoneError('');
  }

  async function handleSaveCustomer(e) {
    e.preventDefault();

    if (!isValidPhone(modalPhone)) {
      setModalPhoneError('Phone must be 11–12 digits.');
      showError('Invalid Phone', 'Phone must be 11–12 digits.');
      return;
    }

    if (modalEmail && !isValidEmail(modalEmail)) {
      showError('Invalid Email', 'Email format is invalid.');
      return;
    }

    try {
      const cust = await api('/customers', {
        method: 'POST',
        body: { name: modalName, email: modalEmail, phone: modalPhone },
      });

      setName(cust.name ?? '');
      setEmail(cust.email ?? '');
      setPhone(cust.phone ?? '');
      setSelectedCustomer(cust);
      setSearchResults((prev) => [cust, ...prev]);

      setIsCreateOpen(false);
      showSuccess('Customer Created', `<b>${cust.name}</b> — ${cust.phone || '-'}`);
    } catch (err) {
      const status = err?.response?.status;
      const m = extractError(err);

      if (status === 409 || /exists|duplicate|UNIQUE/i.test(m)) {
        try {
          const emailNorm = (modalEmail || '').trim().toLowerCase();
          const matches = await api(`/customers/search?email=${encodeURIComponent(emailNorm)}`);
          if (Array.isArray(matches) && matches.length) {
            const existing = matches[0];
            const res = await Swal.fire({
              icon: 'warning',
              title: 'Email already exists',
              html: `Use existing customer <b>${existing.name}</b> — ${existing.phone || '-' }?`,
              showCancelButton: true,
              confirmButtonText: 'Use Existing',
              cancelButtonText: 'Cancel',
            });
            if (res.isConfirmed) {
              setName(existing.name ?? '');
              setEmail(existing.email ?? '');
              setPhone(existing.phone ?? '');
              setSelectedCustomer(existing);
              setSearchResults((prev) => [existing, ...prev.filter((x) => x.id !== existing.id)]);
              setIsCreateOpen(false);
              showSuccess('Customer Selected', `<b>${existing.name}</b> — ${existing.phone || '-'}`);
              return;
            }
          }
        } catch (ignore) {}
      }

      showError('Create Customer Error', m);
    }
  }

  async function searchCustomers() {
    setMsg('');
    setSelectedCustomer(null);
    setSearchResults([]);

    if (phone && !isValidPhone(phone)) {
      const text = 'Phone must be 11–12 digits for search.';
      setMsg(`Error: ${text}`);
      showError('Invalid Phone', text);
      return;
    }
    if (email && !isValidEmail(email)) {
      const text = 'Please enter a valid email to search.';
      setMsg(`Error: ${text}`);
      showError('Invalid Email', text);
      return;
    }
    if (!name && !phone && !email) {
      const text = 'Enter a name, an 11–12 digit phone number, or an email to search.';
      setMsg(text);
      showInfo('Nothing to search', text);
      return;
    }

    try {
      const params = new URLSearchParams();
      if (name) params.append('name', name);
      if (phone) params.append('phone', phone);
      if (email) params.append('email', email);

      const data = await api(`/customers/search?${params.toString()}`);
      const arr = Array.isArray(data) ? data : [];
      setSearchResults(arr);

      if (arr.length === 0) {
        setMsg(
          `No customers found. Details: name="${name || '-'}", phone="${phone || '-'}", email="${email || '-'}".`
        );
        const result = await Swal.fire({
          icon: 'warning',
          title: 'No customers found',
          text: 'Would you like to create a new customer?',
          showCancelButton: true,
          confirmButtonText: 'Create New',
          cancelButtonText: 'Close',
        });
        if (result.isConfirmed) openCreateCustomerModal();
      }
    } catch (e) {
      const err = extractError(e);
      setMsg(`Error during search: ${err}`);
      showError('Search Error', err);
    }
  }

  // NEW: open ticket modal (only if a customer is selected)
  function openTicketModal() {
    if (!selectedCustomer) {
      showInfo('Select a customer', 'Please select a customer first.');
      return;
    }
    setIsTicketOpen(true);
  }
  function closeTicketModal() {
    setIsTicketOpen(false);
  }

  // UPDATE your submit() to compute final title + combined description
  async function submit(e) {
    e.preventDefault();
    setMsg('');

    const finalTitle =
      titleChoice === 'Lain-lain' ? customTitle.trim() : titleChoice.trim();

    if (!finalTitle) {
      showError('Missing Title', 'Please select a title (or type one for Lain-lain).');
      return;
    }

    if (!description?.trim()) {
      showError('Missing Description', 'Please provide a description.');
      return;
    }

    if (!selectedCustomer?.id) {
      showError('Missing Customer', 'Please select a customer before creating a ticket.');
      return;
    }

    // Build finalDescription:
    // - For option-driven titles: combine selected option + optional extra text
    // - For "Lain-lain": just free text (no combining needed)
    let finalDescription = description.trim();
    if (currentDescOptions.length > 0 && allowExtraDesc && extraDesc.trim()) {
      // Join with newline so backend receives one field
      finalDescription = `${finalDescription}\n${extraDesc.trim()}`;
    }

    try {
      const body = {
        title: finalTitle,
        description: finalDescription,
        priority,
        status,
        customerId: selectedCustomer.id,
      };
      const data = await api('/tickets', { method: 'POST', body });

      if (!data?.id) {
        showError('Create Ticket Error', 'Server did not return a ticket ID.');
        return;
      }

      setIsTicketOpen(false);

      if (queueTicketData && queueTicketData.queueTicketId) {
        try {
          await api(`/queue/ticket/${queueTicketData.queueTicketId}/resolve`, {
            method: 'POST',
            body: { notes: `Converted to support ticket ${data.id}` },
          });
        } catch (err) {
          console.error('Failed to mark queue ticket as resolved:', err);
        }
      }

      await Swal.fire({
        icon: 'success',
        title: 'Ticket Created 🎉',
        timer: 900,
        showConfirmButton: true,
        position: 'top',
      });

      const customerNameForSearch =
        (selectedCustomer?.name || name || '').trim();
      setTimeout(() => {
        navigate('./TicketSearch.jsx', {
          state: { prefillName: customerNameForSearch, autoSearch: true },
        });
      }, 100);

      // reset fields
      setTitleChoice('');
      setCustomTitle('');
      setDescription('');
      setPriority('medium');
      setStatus('open');
      setAllowExtraDesc(false);
      setExtraDesc('');
    } catch (e) {
      const err = extractError(e);
      setMsg(`Error creating ticket: ${err}`);
      showError('Create Ticket Error', err);
    }
  }

  return (
    <>
      {/* Regular Modal for New Customer */}
      {isCreateOpen && (
        <Modal onClose={closeCreateCustomerModal} title="New Customer">
          <form onSubmit={handleSaveCustomer}>
            <div style={{ display: 'grid', gap: 8 }}>
              <label>Full Name</label>
              <input
                style={inp}
                value={modalName}
                onChange={(e) => setModalName(e.target.value)}
                placeholder="Jane Doe"
                autoFocus
              />
              <label>Customer Email (optional — used for search too)</label>
              <input
                style={inp}
                value={modalEmail}
                onChange={(e) => setModalEmail(e.target.value)}
                placeholder="jane@example.com"
                type="email"
              />
              <label>Phone (11-12 digits)</label>
              <input
                style={inp}
                value={modalPhone}
                onChange={onModalPhoneChange}
                inputMode="numeric"
                maxLength={12}
                placeholder="08xxxxxxxxxx"
                aria-invalid={!!modalPhoneError}
              />
              {modalPhoneError && <span style={errorText}>{modalPhoneError}</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
              <button type="button" onClick={closeCreateCustomerModal} style={btn}>
                Cancel
              </button>
              <button type="submit" style={btnPrimary}>
                Save Customer
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* NEW: Modal for Create Ticket */}
      {isTicketOpen && (
        <Modal onClose={closeTicketModal} title="Create Ticket">
          <form onSubmit={submit}>
            <div style={{ display: 'grid', gap: 8 }}>
              <div
                style={{
                  padding: 8,
                  border: '1px solid #eee',
                  borderRadius: 8,
                  background: '#fafafa',
                }}
              >
                <div style={{ fontSize: 13, color: '#374151' }}>
                  <b>Customer:</b>{' '}
                  {selectedCustomer
                    ? `${selectedCustomer.name} — ${selectedCustomer.phone || '-'} (${
                        selectedCustomer.email || 'no email'
                      })`
                    : '-'}
                </div>
              </div>

              <label>Title</label>
              <select
                style={inp}
                value={titleChoice}
                onChange={(e) => {
                  const v = e.target.value;
                  setTitleChoice(v);
                  if (v !== 'Lain-lain') setCustomTitle('');
                }}
                required
              >
                <option value="" disabled>
                  — Select a title —
                </option>
                {TITLE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              {/* Show custom title field only when "Lain-lain" is chosen */}
              {titleChoice === 'Lain-lain' && (
                <>
                  <label>Custom Title</label>
                  <input
                    style={inp}
                    value={customTitle}
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Type your custom title…"
                    required
                  />
                </>
              )}

              {/* ---- Description: OPTION + optional extra text, or textarea for Lain-lain ---- */}
              <label>Description</label>
              {titleChoice && currentDescOptions.length > 0 ? (
                <>
                  <select
                    style={inp}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                  >
                    {currentDescOptions.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>

                  <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={allowExtraDesc}
                      onChange={(e) => setAllowExtraDesc(e.target.checked)}
                    />
                    Add extra text
                  </label>

                  {allowExtraDesc && (
                    <textarea
                      style={{ ...inp, minHeight: 100 }}
                      value={extraDesc}
                      onChange={(e) => setExtraDesc(e.target.value)}
                      placeholder="Type extra details… (optional)"
                    />
                  )}
                </>
              ) : (
                <textarea
                  style={{ ...inp, minHeight: 120 }}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={
                    titleChoice === 'Lain-lain'
                      ? 'Tuliskan deskripsi…'
                      : 'Pilih judul untuk melihat opsi deskripsi…'
                  }
                  required
                />
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label>Status</label>
                  <select style={inp} value={status} onChange={(e) => setStatus(e.target.value)}>
                    <option value="open">open</option>
                    <option value="in_progress">in_progress</option>
                    <option value="resolved">resolved</option>
                    <option value="closed">closed</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
                <button type="button" onClick={closeTicketModal} style={btn}>
                  Cancel
                </button>
                <button
                  type="submit"
                  style={btnPrimary}
                  disabled={!canSubmitTitle || !description || !selectedCustomer}
                >
                  Create Ticket
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* PAGE: Search & select customer */}
      <div
        style={{
          maxWidth: 720,
          background: '#fff',
          border: '1px solid #eee',
          borderRadius: 12,
          padding: 16,
        }}
      >
        <h3 style={{ marginTop: 0 }}>Create New Ticket</h3>

        {/* Customer flow */}
        <div style={{ display: 'grid', gap: 8, marginBottom: 12 }}>
          <label>Full Name</label>
          <input
            style={inp}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Jane Doe"
            onKeyDown={handleSearchEnter}
          />

          <label>Customer Phone (11-12 digits)</label>
          <input
            style={inp}
            value={phone}
            onChange={onPhoneChange}
            placeholder="08xxxxxxxxxx"
            inputMode="numeric"
            maxLength={12}
            aria-invalid={!!phoneError}
            onKeyDown={handleSearchEnter}
          />
          {phoneError && <span style={errorText}>{phoneError}</span>}

          <label>Email (for new customer)</label>
          <input
            style={inp}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
            type="email"
            onKeyDown={handleSearchEnter}
          />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" onClick={searchCustomers} style={btnPrimary}>
              Search Customer
            </button>
            <button type="button" onClick={openCreateCustomerModal} style={btn}>
              Create New Customer
            </button>
          </div>
        </div>

        {searchResults.length > 0 && (
          <div
            style={{
              border: '1px solid #eee',
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
            }}
          >
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
                  {c.name} — {c.phone || '-'}{' '}
                  <span style={{ color: '#555' }}>({c.email || 'no email'})</span>
                </li>
              ))}
            </ul>
            {selectedCustomer && (
              <div style={{ marginTop: 8, fontSize: 13 }}>
                Selected: <b>{selectedCustomer.name}</b>
              </div>
            )}

            {/* NEW: Create Ticket trigger */}
            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={openTicketModal}
                style={{
                  ...btnPrimary,
                  opacity: selectedCustomer ? 1 : 0.5,
                  pointerEvents: selectedCustomer ? 'auto' : 'none',
                }}
              >
                Create Ticket
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/** Reusable regular modal with your app's style */
function Modal({ title, children, onClose }) {
  return (
    <div
      style={modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <h3 id="modal-title" style={{ margin: 0 }}>
            {title}
          </h3>
          <button onClick={onClose} style={btn}>
            ×
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

// — styles —
const inp = {
  border: '1px solid #ddd',
  borderRadius: 8,
  padding: '8px 10px',
  marginBottom: 8,
};
const btn = {
  padding: '8px 12px',
  borderRadius: 8,
  background: '#fff',
  border: '1px solid #ddd',
  cursor: 'pointer',
};
const btnPrimary = {
  padding: '8px 12px',
  borderRadius: 8,
  background: '#111',
  color: '#fff',
  border: 'none',
  cursor: 'pointer',
};
const errorText = { color: '#b91c1c', fontSize: 12, marginTop: -4, marginBottom: 8 };
const modalBackdrop = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 16,
  zIndex: 1000,
};
const modalCard = {
  background: '#fff',
  border: '1px solid #eee',
  borderRadius: 12,
  padding: 16,
  width: 'min(520px, 100%)',
  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
};
