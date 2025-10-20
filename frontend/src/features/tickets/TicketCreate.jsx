// src/features/tickets/TicketCreate.jsx
import { useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import Swal from 'sweetalert2';
import TicketDetails from './TicketDetails.jsx';
import { qs, toLocalTime } from '../../lib/utils.js'; // NEW: reuse TicketSearch helpers

export default function TicketCreate() {
  const navigate = useNavigate();
  const location = useLocation();

  const [titleChoice, setTitleChoice] = useState('');
  const [guestType, setGuestType] = useState(''); // sub-option for "Menerima Tamu"
  const [customTitle, setCustomTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium'); // low | medium | high | urgent
  const [status, setStatus] = useState('open');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // compute submit-enabling with the new rule for "Menerima Tamu"
  const canSubmitTitle =
    !!titleChoice &&
    (titleChoice !== 'Lain-lain' || customTitle.trim().length > 0) &&
    (titleChoice !== 'Menerima Tamu' || !!guestType);

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

  // Ticket details modal state
  const [isTicketOpen, setIsTicketOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selected, setSelected] = useState(null);

  // Follow-up modal
  const [followUpOpen, setFollowUpOpen] = useState(false);

  // NEW: "Search Ticket" modal (tickets for the selected customer)
  const [ticketsModalOpen, setTicketsModalOpen] = useState(false);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [ticketsNotice, setTicketsNotice] = useState('');

  // Store queue ticket data for later use
  const [queueTicketData, setQueueTicketData] = useState(null);

  // ---- Title & Description options ----
  const TITLE_OPTIONS = [
    'Layanan Kritik dan Saran',
    'Pembelian Seragam',
    'Siswa Pindah Sekolah',
    'Ketertinggalan Picker Card',
    'Menerima Tamu',
    'Lain-lain',
  ];

  // Sub-options for "Menerima Tamu"
  const GUEST_TYPES = ['Orang tua', 'Vendor', 'Tamu Umum'];

  const DESCRIPTION_OPTIONS = {
    'Layanan Kritik dan Saran': [
      'Detail kritik/saran telah dicatat',
      'Edcon mengumpulkan Informasi',
      'Edcon telah menyampaikan ke pihak terkait',
      'Follow up ke Customer',
    ],
    'Pembelian Seragam': [
      'Size terkonfirmasi',
      'EduCS sudah menghubungi GA (Stok)',
      'Fitting Baju',
      'Pembayaran (tambahkan cash , transfer, atau debit di detail)',
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
    // Keep general options only; guest subtypes are now part of the title for new tickets
    'Menerima Tamu': [
      'Tamu telah mengisi buku tamu',
      'EduCS telah meneruskan informasi ke area',
      'Area telah menghubungi tamu',
    ],
  };

  const currentDescOptions =
    titleChoice && DESCRIPTION_OPTIONS[titleChoice] ? DESCRIPTION_OPTIONS[titleChoice] : [];

  // Allow appending extra free text to an option
  const [allowExtraDesc, setAllowExtraDesc] = useState(false);
  const [extraDesc, setExtraDesc] = useState('');

  useEffect(() => {
    // reset guestType whenever title changes
    setGuestType('');
    if (titleChoice && currentDescOptions.length > 0) {
      setDescription(currentDescOptions[0] || '');
      setAllowExtraDesc(false);
      setExtraDesc('');
    } else if (titleChoice === 'Lain-lain') {
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

  // Modal controls
  function openCreateCustomerModal() {
    setModalName(name || '');
    setModalEmail(email || '');
    setModalPhone(normalizePhone(phone || ''));
    setModalPhoneError('');
    setIsCreateOpen(true);
  }
  function closeCreateCustomerModal() {
    setIsCreateOpen(false);
  }
  function handleSearchEnter(e) {
    if (e.nativeEvent?.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      searchCustomers();
    }
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

  // Ticket modal open/close
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

  // Details modal
  function openDetails(t) {
    setSelected(t);
    setDetailsOpen(true);
  }
  function closeDetails() {
    setDetailsOpen(false);
  }

  // Follow-up modal
  function openFollowUpModal(t) {
    setSelected(t);
    setFollowUpOpen(true);
  }
  function closeFollowUpModal() {
    setFollowUpOpen(false);
  }

  // Close original ticket (used by Follow-up)
  async function closeOriginalTicket(originalTicket) {
    if (!originalTicket?.id) return { ok: false, error: 'Missing ticket id' };

    const ticketId = originalTicket.id;
    const prevStatus = originalTicket.status;
    const nextStatus = 'closed';

    // optimistic update if viewing the same ticket
    if (selected && selected.id === ticketId) {
      setSelected({ ...selected, status: nextStatus });
    }

    try {
      await api(`/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });
      return { ok: true };
    } catch (e) {
      if (selected && selected.id === ticketId) {
        setSelected({ ...selected, status: prevStatus });
      }
      return { ok: false, error: e.message };
    }
  }

  // Submit NEW ticket
  async function submit(e) {
    e.preventDefault();
    setMsg('');

    // Validate title + guestType
    if (!titleChoice) {
      showError('Missing Title', 'Please select a title.');
      return;
    }
    if (titleChoice === 'Lain-lain' && !customTitle.trim()) {
      showError('Missing Title', 'Please type your custom title.');
      return;
    }
    if (titleChoice === 'Menerima Tamu' && !guestType) {
      showError('Missing Guest Type', 'Please choose Orang tua / Vendor / Tamu Umum.');
      return;
    }

    const finalTitle =
      titleChoice === 'Lain-lain'
        ? customTitle.trim()
        : titleChoice === 'Menerima Tamu'
          ? `${titleChoice} : ${guestType}` // e.g., "menerima tamu orang tua"
          : titleChoice.trim();

    if (!description?.trim()) {
      showError('Missing Description', 'Please provide a description.');
      return;
    }

    if (!selectedCustomer?.id) {
      showError('Missing Customer', 'Please select a customer before creating a ticket.');
      return;
    }

    // Build finalDescription
    let finalDescription = description.trim();
    if (currentDescOptions.length > 0 && allowExtraDesc && extraDesc.trim()) {
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

      // Open Ticket Details for the newly created ticket
      openDetails(data);

      // reset input fields
      setTitleChoice('');
      setGuestType('');
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

  // === Tickets Modal (Search Ticket) ===
  function openTicketsModal() {
    if (!selectedCustomer) {
      showInfo('Select a customer', 'Please select a customer first.');
      return;
    }
    setTicketsModalOpen(true);
    fetchTicketsForSelectedCustomer();
  }
  function closeTicketsModal() {
    setTicketsModalOpen(false);
  }

  async function fetchTicketsForSelectedCustomer() {
  if (!selectedCustomer) return;
  setTicketsLoading(true);
  setTicketsNotice('');
  try {
    // Use ALL details: name — phone (email)
    const nameQ  = (selectedCustomer.name  || '').trim();
    const phoneQ = (selectedCustomer.phone || '').trim();
    const emailQ = (selectedCustomer.email || '').trim().toLowerCase();

    // Build q exactly like "josh 089650300004 josh@josh.com"
    const q = [nameQ, phoneQ, emailQ].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim();

    // Primary: text search (same style as TicketSearch.jsx)
    let data = await api(`/tickets${qs({ q, page: 1, pageSize: 50 })}`);
    let list = data?.data || [];

    // Fallback: try filtering by customerId (if your backend supports it)
    if (list.length === 0 && selectedCustomer.id) {
      data = await api(`/tickets${qs({ customerId: selectedCustomer.id, page: 1, pageSize: 50 })}`);
      list = data?.data || [];
    }

    setTickets(list);
    if (list.length === 0) {
      setTicketsNotice(
        `No tickets found for: ${nameQ || '-'} — ${phoneQ || '-'} (${emailQ || 'no email'})`
      );
    }
  } catch (e) {
    const m = e?.message || 'Unknown error';
    setTicketsNotice(`Search failed: ${m}`);
  } finally {
    setTicketsLoading(false);
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

      {/* Modal for Create Ticket */}
      {isTicketOpen && (
        <Modal onClose={closeTicketModal} title="Buat Ticket Baru">
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

              <label style={{backgroundColor:'black' , width:'fit-content', color:'white', padding:'1px 6px' , }}>Nama Layanan</label>
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
                  — Pilih layanan —
                </option>
                {TITLE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>

              {/* Show guest type when "Menerima Tamu" */}
              {titleChoice === 'Menerima Tamu' && (
                <>
                  <label>Kategori Tamu</label>
                  <select
                    style={inp}
                    value={guestType}
                    onChange={(e) => setGuestType(e.target.value)}
                    required
                  >
                    <option value="" disabled>
                      — Pilih kategori tamu —
                    </option>
                    {GUEST_TYPES.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </select>
                </>
              )}

              {/* Custom title only when "Lain-lain" */}
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

              {/* Description */}
              <label style={{backgroundColor:'black' , width:'fit-content', color:'white', padding:'1px 6px' , }} >Alur Layanan</label>
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

                  <label className='badge' style={{ display: 'flex', 
                    fontSize: '15px', alignItems: 'center', 
                    gap: 8 , width:'fit-content' , padding:'10px' , 
                    border:'none', borderRadius:'0px'}}>
                    <input                      
                      type="checkbox"
                      checked={allowExtraDesc}
                      onChange={(e) => setAllowExtraDesc(e.target.checked)}
                    />
                    Tambahkan detail (centang ✅)
                  </label>
                  {allowExtraDesc && (
                    <textarea
                      style={{ ...inp, minHeight: 100 }}
                      value={extraDesc}
                      onChange={(e) => setExtraDesc(e.target.value)}
                      placeholder="Tulis detail tambahan… (opsional)"
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

      {/* TICKET DETAILS MODAL */}
      {detailsOpen && selected && (
        <Modal title="Ticket Details" onClose={closeDetails}>
          <TicketDetails
            ticketId={selected.id}
            initialTicket={selected}
            onClose={closeDetails}
            onFollowUp={() => {
              closeDetails();
              openFollowUpModal(selected);
            }}
            onCloseTicket={async (ticket) => {
              const res = await closeOriginalTicket(ticket);
              return res;
            }}
          />
        </Modal>
      )}

      {/* FOLLOW-UP MODAL */}
      {followUpOpen && selected && (
        <Modal title="Create Follow-up Ticket" onClose={closeFollowUpModal}>
          <FollowUpTicket
            baseTicket={selected}
            customerOverride={selectedCustomer}
            onClose={closeFollowUpModal}
            onCloseOriginal={closeOriginalTicket}
            onOpenDetails={(ticket) => {
              setSelected(ticket);
              setDetailsOpen(true);
              closeFollowUpModal();
            }}
          />
        </Modal>
      )}

      {/* SEARCH TICKETS (for this customer) MODAL */}
      {ticketsModalOpen && selectedCustomer && (
        <Modal title={`Tickets — ${selectedCustomer.name}`} onClose={closeTicketsModal}>
          <CustomerTicketsModal
            items={tickets}
            loading={ticketsLoading}
            notice={ticketsNotice}
            onRefresh={fetchTicketsForSelectedCustomer}
            onOpenDetails={(t) => {
              setSelected(t);
              setDetailsOpen(true);
              closeTicketsModal();
            }}
            onFollowUp={(t) => {
              setSelected(t);
              setDetailsOpen(false);
              setTicketsModalOpen(false);
              setFollowUpOpen(true);
            }}
            onCloseTicket={closeOriginalTicket}
          />
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
              <>
                <div style={{ marginTop: 8, fontSize: 13 }}>
                  Selected: <b>{selectedCustomer.name}</b>
                </div>

                {/* Create Ticket & Search Ticket triggers */}
                <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
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

                  <button
                    type="btn"
                    onClick={openTicketsModal}
                    style={{
                      ...btn,
                      borderColor: '#111',
                    }}
                  >
                    Search Ticket
                  </button>
                </div>
              </>
            )}
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

// ======= FOLLOW-UP SUPPORT =======

const repeatCountRegex = /^(?:Follow\s*up\s*:?\s*)+/i;
const numberedPrefixRegex = /^Follow\s*up\s*(\d+)\s*[xX]\s*:\s*/i;
const BASE_MENERIMA = /^menerima\s*tamu/i;

function computeFollowUpTitle(baseTitleRaw) {
  let baseTitle = (baseTitleRaw || '').trim();
  let count = 0;

  const mNum = baseTitle.match(numberedPrefixRegex);
  if (mNum) {
    count = parseInt(mNum[1], 10) || 0;
    baseTitle = baseTitle.replace(numberedPrefixRegex, '').trim();
  } else {
    const mRep = baseTitle.match(repeatCountRegex);
    if (mRep) {
      const prefix = mRep[0];
      count = (prefix.match(/Follow/gi) || []).length;
      baseTitle = baseTitle.replace(repeatCountRegex, '').trim();
    }
  }
  const next = count + 1;
  return `Follow up ${next}X: ${baseTitle}`;
}
function stripFollowUpPrefix(title) {
  if (!title) return '';
  return title.replace(numberedPrefixRegex, '').replace(repeatCountRegex, '').trim();
}
function normalizeBaseTitleForFollowUp(t) {
  const stripped = stripFollowUpPrefix(t || '').trim();
  if (stripped.toLowerCase().startsWith('menerima tamu')) return 'Menerima Tamu';
  return stripped;
}

// Follow-up description options (unified key for "Menerima Tamu" + default "Follow up")
const DESCRIPTION_OPTIONS_FOLLOWUP = {
  'Layanan Kritik dan Saran': [
    'Saran',
    'Kritik',
    'Pertanyaan Umum',
    'Edcon mengumpulkan Informasi',
    'Edcon Telah menyampaikan ke pihak terkait',
    'Follow up ke Customer',
  ],
  'Pembelian Seragam': [
    'Size terkonfirmasi',
    'EduCS sudah menghubungi GA (Stok)',
    'Fitting Baju',
    'Pembayaran (tambahkan cash , transfer, atau debit di detail)',
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
  'Menerima Tamu': [
    'Follow up',
    'Tamu telah mengisi buku tamu',
    'EduCS telah meneruskan informasi ke area',
    'Area telah menghubungi tamu',
  ],
  // "Lain-lain" → free text
};

// --- Step/description helpers for follow-ups ---
const STEP_LINE_REGEX = /^\s*(?:Step\s*)?(\d+)[\.\)]\s*/i;

/** 
 * Convert a free-form description into numbered steps if needed.
 * If it already contains "Step N." or "N)" lines, we keep them.
 * Otherwise we wrap the whole text as "1) <text>".
 */
function normalizeDescToSteps(desc) {
  const raw = (desc || '').trim();
  if (!raw) return { stepLines: [], last: 0 };

  const lines = raw.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const hasNumbered = lines.some((l) => STEP_LINE_REGEX.test(l));

  if (hasNumbered) {
    let last = 0;
    lines.forEach((l) => {
      const m = l.match(STEP_LINE_REGEX);
      if (m) last = Math.max(last, parseInt(m[1], 10) || 0);
    });
    return { stepLines: lines, last };
  }

  // No numbering → make the whole original description "1) ..."
  return { stepLines: [`1) ${raw}`], last: 1 };
}

/** Build the next step line text (e.g., "2) Follow up — called parent"). */
function buildNextStepLine(nextNumber, main, extra) {
  const details = extra && extra.trim() ? ` — ${extra.trim()}` : '';
  return `${nextNumber}) ${main.trim()}${details}`;
}

// Extract the main step label from a numbered step line.
// e.g. "2) Follow up — called parent" -> "Follow up"
function extractStepLabel(line) {
  if (!line) return '';
  let s = String(line).trim();
  // remove leading "N) " or "Step N) " etc.
  s = s.replace(STEP_LINE_REGEX, '').trim();
  // take text before a dash / em-dash / colon (if present)
  const m = s.split(/\s*[—\-:]\s*/); // em-dash, dash, colon
  return (m[0] || s).trim();
}

function norm(s) {
  return (s || '').trim().toLowerCase();
}


/* ---------- Follow-up Modal Content ---------- */
function FollowUpTicket({ baseTicket, customerOverride, onClose, onCloseOriginal, onOpenDetails }) {
  const co = customerOverride || {};
  const customerName  = co.name  ?? baseTicket.customer_name  ?? '';
  const customerPhone = co.phone ?? baseTicket.customer_phone ?? '';
  const customerEmail = co.email ?? baseTicket.customer_email ?? '';
  const customerIdForBody = baseTicket.customer_id ?? co.id;

  const refId = baseTicket.id ?? '-';
  const isClosed = (baseTicket.status || '').toLowerCase() === 'closed';

  if (isClosed) {
    return (
      <div style={{ display: 'grid', gap: 10 }}>
        <div style={{ fontSize: 14, color: '#b91c1c', fontWeight: 600 }}>
          This ticket is closed. You cannot create a follow-up.
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={btnPrimary}>Close</button>
        </div>
      </div>
    );
  }

  const lockedPrefix = `Ref Ticket: ${refId}
Customer: ${customerName || '-'}
Phone: ${customerPhone || '-'}${customerEmail ? `\nEmail: ${customerEmail}` : ''}`;

  // Base title (normalized) and final title rule
  const [baseTitle] = useState(normalizeBaseTitleForFollowUp(baseTicket.title || ''));
  const finalTitle = BASE_MENERIMA.test(baseTitle)
    ? 'menerima tamu'
    : computeFollowUpTitle(baseTicket.title || baseTitle || '');

  const [priority, setPriority] = useState(baseTicket.priority || 'medium');

  // Description options (same scheme as before)
  const rootTitle = BASE_MENERIMA.test(baseTitle) ? 'Menerima Tamu' : baseTitle;
  const descOptions = DESCRIPTION_OPTIONS_FOLLOWUP[rootTitle] || [];
  const isLainLain = rootTitle === 'Lain-lain';

  // Previous steps derived from the base/original ticket description
  const { stepLines, last } = normalizeDescToSteps(baseTicket.description || '');
  const previousStepsText = stepLines.join('\n');
  const nextStepNumber = last + 1;

  // Build a set of option labels already used in previous steps
  const usedOptionSet = new Set(
    stepLines.map(extractStepLabel).map(norm).filter(Boolean)
  );

  // Extra details for THIS step
  const [extraDetails, setExtraDetails] = useState('');

  // Allow appending extra free text to the step
  const [allowExtraDesc, setAllowExtraDesc] = useState(false);
  const [extraDesc, setExtraDesc] = useState('');

  const [descOption, setDescOption] = useState(() =>
    descOptions.length ? descOptions[0] : 'Follow up'
  );
useEffect(() => {
  if (descOptions.length) {
    const firstUnused = descOptions.find(opt => !usedOptionSet.has(norm(opt)));
    setDescOption(firstUnused || descOptions[0]);
  } else {
    setDescOption('Follow up');
  }    
  setAllowExtraDesc(false);
    setExtraDesc('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootTitle, previousStepsText]);

  const [msg, setMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function submit(e) {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    setMsg('');

    try {
      // Compose THIS step line (e.g., "2) Follow up — called parent")
      let nextLine = buildNextStepLine(
        nextStepNumber,
        (!isLainLain && descOptions.length ? descOption : 'Follow up'),
        extraDetails
      );

      // Append extra text if allowed
      if (allowExtraDesc && extraDesc.trim()) {
        nextLine = `${nextLine}\n${extraDesc.trim()}`;
      }

      // Final description = header + two newlines + previous (numbered) + newline + this step
      const bodyDescription =
        `${previousStepsText}${previousStepsText ? '\n' : ''}${nextLine}`;

      const body = {
        title: finalTitle,
        description: bodyDescription,
        priority,
        ...(customerIdForBody ? { customerId: customerIdForBody } : {}),
      };

      const data = await api('/tickets', { method: 'POST', body });

      // Close original if provided
      if (onCloseOriginal) {
        await onCloseOriginal(baseTicket);
      }

      // Immediately open details of the new follow-up
      if (onOpenDetails) return onOpenDetails(data);

      setIsSubmitting(false);
    } catch (e2) {
      setIsSubmitting(false);
      setMsg(`Error: ${e2.message}`);
    }
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 10 , minWidth: 400, maxHeight: '80vh', overflowY: 'auto'}}>
      <textarea
        style={{ ...inp, minHeight: 18, background: '#4a4a4aff', color: '#ffffffff' }}
        value={lockedPrefix}
        readOnly
      />

      <input
        style={{ ...inp, background: '#4a4a4aff', color: '#ffffffff', fontWeight: '600' }}
        value={baseTitle}
        readOnly
      />
      <div style={{ fontSize: 12, color: '#64748b', marginTop: -10 }}>
      <b>{finalTitle}</b>
      </div>

      {/* Previous steps (read-only) */}
      <label></label>
      <textarea
        style={{ ...inp, minHeight: 20, background: '#d3d3d3ff', color: '#000000ff' , overflowY: 'auto' }}
        value={previousStepsText  || '(none yet — original description will become Step 1)'}
        readOnly
      />

{/* This step */}
<label 
style={{ backgroundColor:'#000000ff', 
  borderRadius:'5px',
  fontWeight:700,
  padding:'1px 7px 5px', color:'white', 
width:'fit-content' }}
>Pilih tindakan 👇
</label>
{!isLainLain && descOptions.length > 0 ? (
  <>
    <select
      style={inp}
      value={descOption}
      onChange={(e) => setDescOption(e.target.value)}
      required
    >
      {descOptions.map((opt) => {
        const isUsed = usedOptionSet.has(norm(opt));
        return (
          <option key={opt} value={opt} disabled={isUsed}>
            {opt}{isUsed ? '✅' : ''}
          </option>
        );
      })}
    </select>

    {descOptions.every(o => usedOptionSet.has(norm(o))) && (
      <div style={{ fontSize: 12, color: '#64748b', marginTop: -4 }}>
        All preset options have been used in previous steps — add details below.
      </div>
    )}

    <label className='badge' style={{ display: 'flex', 
                    fontSize: '15px', alignItems: 'center', 
                    gap: 8 , width:'fit-content' , padding:'10px' , 
                    border:'none', borderRadius:'0px'}}>
      <input
        type="checkbox"
        checked={allowExtraDesc}
        onChange={(e) => setAllowExtraDesc(e.target.checked)}
      />
      Tambahkan detail
    </label>

    {allowExtraDesc && (
      <textarea
        style={{ ...inp, minHeight: 100 }}
        value={extraDesc}
        onChange={(e) => setExtraDesc(e.target.value)}
        placeholder="Tulis detail tambahan… (opsional)"
      />
    )}
  </>
) : ( 
         <>
          <textarea
            style={{ ...inp, minHeight: 120 }}
            value={extraDetails}
            onChange={(e) => setExtraDetails(e.target.value)}
            placeholder={`Describe Step ${nextStepNumber}…`}
            required
          />
          <label className='badge'>
            <input
              type="checkbox"
              checked={allowExtraDesc}
              onChange={(e) => setAllowExtraDesc(e.target.checked)}
            />
            Tambahkan detail
          </label>
          {allowExtraDesc && (
            <textarea
              style={{ ...inp, minHeight: 100 }}
              value={extraDesc}
              onChange={(e) => setExtraDesc(e.target.value)}
              placeholder="Tulis detail tambahan… (opsional)"
            />
          )}
        </>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ ...btnPrimary, opacity: isSubmitting ? 0.7 : 1 }} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : `Submit (add Step ${nextStepNumber})`}
        </button>
        <button type="button" onClick={onClose} style={btn}>Cancel</button>
      </div>

      {msg && <p style={{ fontSize: 13, color: msg.startsWith('Error') ? '#b91c1c' : '#374151' }}>{msg}</p>}
    </form>
  );
}


/* ---------- Tickets list modal (for "Search Ticket") ---------- */
function CustomerTicketsModal({
  items,
  loading,
  notice,
  onRefresh,
  onOpenDetails,
  onFollowUp,
  onCloseTicket,
}) {
  return (
    <div style={{ display: 'grid', gap: 12 , maxHeight: '80vh'}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontWeight: 600 }}>Tickets</div>
        <button onClick={onRefresh} style={btn}>Refresh</button>
      </div>

      {loading && <div style={{ fontSize: 13, color: '#555' }}>Loading…</div>}
      {notice && !loading && (
        <div style={{ padding: 8, border: '1px solid #fed7aa', background: '#fff7ed', color: '#9a3412', borderRadius: 8 }}>
          {notice}
        </div>
      )}

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
          gap: 12,
          maxHeight: 520,
          overflow: 'auto',
          paddingRight: 4,
        }}
      >
        {items.map((t) => {
          const isClosed = (t.status || '').toLowerCase() === 'closed';
          return (
            <div
              key={t.id}
              style={{
                border: '1px solid #eee',
                borderRadius: 12,
                padding: 12,
                background: '#fff',
                cursor: 'pointer',
              }}
              onClick={() => onOpenDetails?.(t)}
            >
              <div style={{ fontWeight: 600 }}>{t.title}</div>
              <div style={{ fontSize: 12, color: '#555' }}>
                Status: {t.status} • Priority: {t.priority}
              </div>
              <div style={{ fontSize: 12 }}>
                Creator: {t.created_by_username ?? t.created_by ?? '-'}
              </div>
              <div style={{ fontSize: 11, color: '#666' }}>
                {toLocalTime(t.created_at)}
              </div>
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={(e) => { e.stopPropagation(); onFollowUp?.(t); }}
                  style={isClosed ? { ...btnPrimary, background: '#9ca3af', cursor: 'not-allowed' } : btnPrimary}
                  disabled={isClosed}
                  title={isClosed ? 'This ticket is closed; follow-up is not allowed.' : 'Create a follow-up ticket'}
                >
                  Follow Up → Create New Ticket
                </button>
                <button
                  onClick={async (e) => {
                    e.stopPropagation();
                    const res = await onCloseTicket?.(t);
                    if (res?.ok) onRefresh?.();
                  }}
                  style={{ padding: '8px 12px', margin:'10px', borderRadius: 8, background: '#b91c1c', color: '#fff', border: 'none', cursor: 'pointer' }}
                  disabled={isClosed}
                  title={isClosed ? 'Already closed' : 'Mark this ticket as closed'}
                >
                  Close Ticket
                </button>
              </div>
            </div>
          );
        })}
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
  width: 'min(640px, 100%)', // a bit wider for ticket grid
  boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
};
