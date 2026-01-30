import { useState, useMemo, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Swal from 'sweetalert2';
import { CheckCircle, X, Search } from 'lucide-react';
import { api } from '../../lib/api.js';
import { qs, toLocalTime } from '../../lib/utils.js';
import TicketDetails from './TicketDetails.jsx';

const repeatCountRegex = /^(?:Follow\s*up\s*:?\s*)+/i;
const numberedPrefixRegex = /^Follow\s*up\s*(\d+)\s*[xX]\s*:\s*/i;

// Shared with TicketCreate (keep in sync)
const DESCRIPTION_OPTIONS = {
  'Layanan Kritik dan Saran': ['Saran', 'Kritik', 'Pertanyaan Umum', 'Edcon mengumpulkan Informasi', 'Edcon Telah menyampaikan ke pihak terkait', 'Follow up ke Customer'],
  'Pembelian Seragam': ['Size terkonfirmasi', 'EduCS sudah menghubungi GA (Stok)', 'Fitting Baju', 'Pembayaran', 'Pengambilan di EduCS'],
  'Siswa Pindah Sekolah': ['Menyampaikan prosedur pindah Sekolah', 'Konfirmasi ke pihak terkait', 'Janji temu principal', 'Telah bertemu principal', 'Telah mengisi Formulir pindah sekolah', 'Formulir telah diserahkan ke admin area', 'Surat Pindah telah diserahkan kepada orang tua'],
  'Ketertinggalan Picker Card': ['Mengambil foto penjemput', 'Menerbitkan Kartu sementara', 'Menerbitkan Kartu baru (biaya)', 'Mengalihkan nama siswa ke Dismissal App'],
  'Menerima Tamu : Orang tua': ['Tamu telah mengisi buku tamu', 'EduCS telah meneruskan informasi ke area', 'Area telah menghubungi tamu'],
  'Menerima Tamu : Vendor': ['Tamu telah mengisi buku tamu', 'EduCS telah meneruskan informasi ke area', 'Area telah menghubungi tamu'],
  'Menerima Tamu : Tamu Khusus': ['Tamu telah mengisi buku tamu', 'EduCS telah meneruskan informasi ke area', 'Area telah menghubungi tamu'],
  // "Lain-lain" intentionally no options → free text
};

function computeFollowUpTitle(baseTitleRaw /*, customerName, customerPhone */) {
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

const isValidEmail = (val) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val || '');

export default function TicketSearch() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); // kept for future use
  const location = useLocation();
  const [phone, setPhone] = useState('');
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);

  // follow-up modal
  const [followUpOpen, setFollowUpOpen] = useState(false);

  // details modal
  const [detailsOpen, setDetailsOpen] = useState(false);
  function openDetails(t) {
    setSelected(t);
    setDetailsOpen(true);
  }
  function closeDetails() {
    setDetailsOpen(false);
  }

  const [notice, setNotice] = useState('');
  const isValidPhone = (val) => /^\d{11,12}$/.test(val || '');

  function phoneKeyGuard(e) {
    const k = e.key;
    if (k === 'Enter') return;
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'];
    if (allowed.includes(k)) return;
    if (/^\d$/.test(k)) {
      if ((e.target.value || '').length >= 12) e.preventDefault();
      return;
    }
    e.preventDefault();
  }

  const onPhoneChange = (e) => {
    const digits = (e.target.value || '').replace(/\D/g, '').slice(0, 12);
    setPhone(digits);
  };

  async function refreshTickets({ preserveSelection = true, preserveModal = true } = {}) {
    const nameQ = (name || '').trim();
    const emailQ = (email || '').trim().toLowerCase();
    const phoneQ = (phone || '').trim();

    if (phoneQ && !isValidPhone(phoneQ)) {
      await Swal.fire({
        icon: 'error',
        title: 'Invalid phone',
        text: 'Phone must be numbers only and exactly 11-12 digits.',
      });
      return;
    }

    const q = [nameQ, emailQ, phoneQ].filter(Boolean).join(' ').trim();

    try {
      const data = await api(`/tickets${qs({ q, page: 1, pageSize: 50 })}`);
      const list = data?.data || [];

      setItems(list);
      if (!preserveSelection) setSelected(null);
      if (!preserveModal) {
        setFollowUpOpen(false);
        setDetailsOpen(false);
      }
      setNotice('');

      if (list.length === 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Not found',
          text: 'No tickets matched your search.',
          confirmButtonText: 'OK',
        });
      }
    } catch (e) {
      const msg = e?.message || 'Unknown error';
      setNotice(`Search failed: ${msg}`);
      await Swal.fire({ icon: 'error', title: 'Search error', text: msg });
    }
  }

  // If navigated here with a prefilled name, auto-run the search once
  useEffect(() => {
    const pre = location.state?.prefillName || '';
    const auto = !!location.state?.autoSearch;
    if (pre) {
      setName(pre);
      if (auto) {
        // let state update commit, then search with the new name
        setTimeout(() => {
          refreshTickets({ preserveSelection: false, preserveModal: false });
        }, 0);
      }
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // prevent double submit per ticket
  const [closingId, setClosingId] = useState(null);

  async function handleCloseClick(t, e) {
    e?.stopPropagation?.();
    if (!t?.id) return;

    const isClosed = (t.status || '').toLowerCase() === 'closed';
    if (isClosed) {
      await Swal.fire({ icon: 'info', title: 'Already closed', text: `Ticket ${t.id} is already closed.` });
      return;
    }

    const res = await Swal.fire({
      icon: 'warning',
      title: 'Close this ticket?',
      html: `<div style="text-align:left"><b>ID:</b> ${t.id}<br/><b>Title:</b> ${t.title || '-'}</div>`,
      showCancelButton: true,
      confirmButtonText: 'Yes, close it',
      cancelButtonText: 'Cancel',
    });
    if (!res.isConfirmed) return;

    try {
      setClosingId(t.id);
      const result = await closeOriginalTicket(t);
      if (result?.ok) {
        await Swal.fire({ icon: 'success', title: 'Ticket closed', timer: 900, showConfirmButton: false });
      } else {
        await Swal.fire({ icon: 'error', title: 'Failed to close', text: result?.error || 'Unknown error' });
      }
    } finally {
      setClosingId(null);
    }
  }

  function handleSearchEnter(e) {
    if (e.nativeEvent?.isComposing) return;
    if (e.key === 'Enter' && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      refreshTickets({ preserveSelection: false, preserveModal: false });
    }
  }

  const grouped = useMemo(() => {
    const map = new Map();
    for (const t of items) {
      const disp = t.customer_name?.trim() || '(No customer)';
      const key = disp.toLowerCase();
      if (!map.has(key)) map.set(key, { displayName: disp, items: [] });
      map.get(key).items.push(t);
    }
    return Array.from(map.values()).sort((a, b) => a.displayName.localeCompare(b.displayName));
  }, [items]);

  function openFollowUpModal(t) {
    setSelected(t);
    setFollowUpOpen(true);
  }
  function closeFollowUpModal() {
    setFollowUpOpen(false);
  }

  function handleFollowUpClick(t) {
    const isClosed = (t.status || '').toLowerCase() === 'closed';
    if (isClosed) {
      setNotice(`Ticket ${t.id ?? ''} is closed. You cannot create a follow-up.`);
      return;
    }
    setNotice('');
    openFollowUpModal(t);
  }

  async function closeOriginalTicket(originalTicket) {
    if (!originalTicket?.id) return { ok: false, error: 'Missing ticket id' };

    const ticketId = originalTicket.id;
    const prevStatus = originalTicket.status;
    const nextStatus = 'closed';

    // optimistic UI
    setItems((curr) =>
      curr.map((it) => (it.id === ticketId ? { ...it, status: nextStatus } : it))
    );
    setSelected((curr) => (curr && curr.id === ticketId ? { ...curr, status: nextStatus } : curr));

    try {
      await api(`/tickets/${ticketId}/status`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });
      return { ok: true };
    } catch (e) {
      // rollback
      setItems((curr) =>
        curr.map((it) => (it.id === ticketId ? { ...it, status: prevStatus } : it))
      );
      setSelected((curr) => (curr && curr.id === ticketId ? { ...curr, status: prevStatus } : curr));
      setNotice(`Failed to close ticket ${ticketId}: ${e.message}`);
      return { ok: false, error: e.message };
    }
  }

  return (
    <div style={{ display: 'grid', gap: 12, marginBottom: 16, padding: '20px' }}>
      <div style={{ display: 'flex', flexDirection: 'row', gap: 12, alignItems: 'start', marginBottom: 8 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexGrow: 1 }}>
          <label style={{ fontSize: 15, fontWeight: '600' }}>Search by Name</label>
          <input
            style={{ width: '60%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px' }}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Customer name"
            onKeyDown={handleSearchEnter}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexGrow: 1 }}>
          <label style={{ fontSize: 15, fontWeight: '600' }}>Search by Phone</label>
          <input
            style={{ width: '60%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px' }}
            value={phone}
            onChange={onPhoneChange}
            placeholder="08xxxxxxxxxx"
            inputMode="numeric"
            maxLength={12}
            onKeyDown={(e) => { phoneKeyGuard.call(null, e); handleSearchEnter(e); }}
          />
        </div>
      </div>

      <div>
        <button
          onClick={() => refreshTickets({ preserveSelection: false, preserveModal: false })}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '8px 16px', borderRadius: 8, background: '#3b82f6',
            color: '#fff', border: '1px solid #3b82f6', cursor: 'pointer', fontWeight: 500
          }}
        >
          <Search size={16} /> Search
        </button>
      </div>

      {notice && (
        <div style={{ padding: '8px 12px', borderRadius: 8, background: '#fff7ed', border: '1px solid #fed7aa', color: '#9a3412' }}>
          {notice}
        </div>
      )}

      {/* GROUPED RESULTS */}
      <div style={{ display: 'grid', gap: 16 }}>
        {grouped.map((group) => (
          <div key={group.displayName}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
              <h4 style={{ margin: 0 }}>{group.displayName}</h4>
              <span style={{ fontSize: 12, color: '#777' }}>({group.items.length})</span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 12,
              }}
            >
              {group.items.map((t, i) => {
                const isClosed = (t.status || '').toLowerCase() === 'closed';
                return (
                  <div
                    key={t.id ?? `ticket-${group.displayName}-${i}`}
                    style={{
                      border: '1px solid #eee',
                      borderRadius: 12,
                      padding: 12,
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                    onClick={() => openDetails(t)}
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
                      {toLocalTime(t.created_at)}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleFollowUpClick(t); }}
                        style={isClosed ? btnDisabled : btnPrimary}
                        disabled={isClosed}
                        title={isClosed ? 'This ticket is closed; follow-up is not allowed.' : 'Create a follow-up ticket'}
                      >
                        Follow Up → Create New Ticket
                      </button>
                      <button
                        onClick={(e) => handleCloseClick(t, e)}
                        style={isClosed ? btnDisabled : btnDanger}
                        disabled={isClosed || closingId === t.id}
                        title={isClosed ? 'Already closed' : 'Mark this ticket as closed'}
                      >
                        {closingId === t.id ? 'Closing…' : 'Close Ticket'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

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
              if (res?.ok) {
                await refreshTickets({ preserveSelection: true, preserveModal: true });
              }
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
            onClose={closeFollowUpModal}
            onCloseOriginal={closeOriginalTicket}
            onRefresh={() => refreshTickets({ preserveSelection: true, preserveModal: true })}
          />
        </Modal>
      )}
    </div>
  );
}

/* ---------- Follow-up Modal Content ---------- */
function FollowUpTicket({ baseTicket, onClose, onCloseOriginal, onRefresh }) {
  const customerName = baseTicket.customer_name || '';
  const customerPhone = baseTicket.customer_phone || '';
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
Phone: ${customerPhone || '-'}`;

  // Base title (without the "Follow up ...")
  const [baseTitle] = useState(stripFollowUpPrefix(baseTicket.title || ''));
  const finalTitle = computeFollowUpTitle(baseTicket.title || baseTitle || '');
  const [priority, setPriority] = useState(baseTicket.priority || 'medium');

  // ---- NEW: description option handling (mirrors TicketCreate) ----
  const rootTitle = baseTitle; // the "real" title that maps to DESCRIPTION_OPTIONS
  const descOptions = DESCRIPTION_OPTIONS[rootTitle] || [];
  const isLainLain = rootTitle === 'Lain-lain';

  const [descOption, setDescOption] = useState(() =>
    descOptions.length ? descOptions[0] : ''
  );
  useEffect(() => {
    if (descOptions.length) setDescOption(descOptions[0]);
    else setDescOption('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rootTitle]);

  // Optional additional note appended after the selected option
  const [extraDetails, setExtraDetails] = useState('');

  const [msg, setMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedTicket, setSubmittedTicket] = useState(null);
  const [originalClosed, setOriginalClosed] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (isSubmitting || submittedTicket) return;

    setIsSubmitting(true);
    setMsg('');

    try {
      // Build final description:
      // - If title has options → use the selected option + optional extra details
      // - If "Lain-lain" → use the free-text area
      let bodyDescription = lockedPrefix + '\n\n';
      if (!isLainLain && descOptions.length) {
        bodyDescription += descOption || '';
        if (extraDetails.trim()) {
          bodyDescription += `\n\n${extraDetails.trim()}`;
        }
      } else {
        // Free text required for Lain-lain
        if (!extraDetails.trim()) {
          setIsSubmitting(false);
          setMsg('Please enter description for "Lain-lain".');
          return;
        }
        bodyDescription += extraDetails.trim();
      }

      const body = {
        title: finalTitle,
        description: bodyDescription,
        priority,
        ...(baseTicket.customer_id ? { customerId: baseTicket.customer_id } : {}),
      };

      const data = await api('/tickets', { method: 'POST', body });
      setSubmittedTicket(data);

      if (onCloseOriginal) {
        const res = await onCloseOriginal(baseTicket);
        setOriginalClosed(!!res?.ok);
        if (!res?.ok && res?.error) {
          setMsg(`Follow-up created, but failed to close original: ${res.error}`);
        }
      }

      if (onRefresh) await onRefresh();
      setIsSubmitting(false);
    } catch (e) {
      setIsSubmitting(false);
      setMsg(`Error: ${e.message}`);
    }
  }

  if (submittedTicket) {
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ fontSize: 14, color: '#16a34a', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <CheckCircle size={18} /> Follow-up ticket created!
        </div>
        <div style={{ fontSize: 14 }}>
          <b>ID:</b> {submittedTicket.id ?? '(check list)'}
        </div>
        <div style={{ fontSize: 14 }}>
          <b>Title:</b> {submittedTicket.title || '-'}
        </div>
        {originalClosed === true && (
          <div style={{ fontSize: 13, color: '#15803d' }}>
            Original ticket has been <b>closed</b>.
          </div>
        )}
        {originalClosed === false && (
          <div style={{ fontSize: 13, color: '#b91c1c' }}>
            Could not close the original ticket. Please update status manually.
          </div>
        )}
        <div style={{ display: 'flex', gap: 8, marginTop: 8, justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={btnPrimary}>Close</button>
        </div>
        {msg && <p style={{ fontSize: 13, color: msg.startsWith('Error') ? '#b91c1c' : '#374151' }}>{msg}</p>}
      </div>
    );
  }

  return (
    <form onSubmit={submit} style={{ display: 'grid', gap: 10 }}>
      <textarea
        style={{ ...inp, minHeight: 88, background: '#4a4a4aff', color: '#ffffffff' }}
        value={lockedPrefix}
        readOnly
      />

      <label>Subject</label>
      <input
        style={{ ...inp, background: '#4a4a4aff', color: '#ffffffff', fontWeight: '600' }}
        value={baseTitle}
        readOnly
      />
      <div style={{ fontSize: 12, color: '#64748b', marginTop: -4 }}>
        Final title → <b>{finalTitle}</b>
      </div>

      {/* NEW: Description options (same behavior as TicketCreate) */}
      <label>Description</label>
      {!isLainLain && descOptions.length > 0 ? (
        <>
          <select
            style={inp}
            value={descOption}
            onChange={(e) => setDescOption(e.target.value)}
            required
          >
            {descOptions.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <label style={{ marginTop: 4 }}>Add details (optional)</label>
          <textarea
            style={{ ...inp, minHeight: 100 }}
            value={extraDetails}
            onChange={(e) => setExtraDetails(e.target.value)}
            placeholder="Add more context (optional)"
          />
        </>
      ) : (
        <textarea
          style={{ ...inp, minHeight: 120 }}
          value={extraDetails}
          onChange={(e) => setExtraDetails(e.target.value)}
          placeholder='Tuliskan deskripsi untuk "Lain-lain"'
          required
        />
      )}

      <label>Priority</label>
      <select style={inp} value={priority} onChange={(e) => setPriority(e.target.value)}>
        <option>low</option>
        <option>medium</option>
        <option>high</option>
        <option>urgent</option>
      </select>

      <div style={{ display: 'flex', gap: 8 }}>
        <button style={{ ...btnPrimary, opacity: isSubmitting ? 0.7 : 1 }} disabled={isSubmitting}>
          {isSubmitting ? 'Submitting…' : 'Submit'}
        </button>
        <button type="button" onClick={onClose} style={btn}>Cancel</button>
      </div>

      {msg && <p style={{ fontSize: 13, color: msg.startsWith('Error') ? '#b91c1c' : '#374151' }}>{msg}</p>}
    </form>
  );
}

/* ---------- Simple Modal ---------- */
function Modal({ title, children, onClose }) {
  return (
    <div style={modalBackdrop} role="dialog" aria-modal="true" aria-labelledby="modal-title" onClick={onClose}>
      <div style={modalCard} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <h3 id="modal-title" style={{ margin: 0 }}>{title}</h3>
          <button onClick={onClose} style={btn}><X size={18} /></button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}

/* ---------- Styles ---------- */
const inp = { border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px' };
const btn = { padding: '8px 12px', border: '1px solid #ddd', borderRadius: 8, background: '#fff', cursor: 'pointer' };
const btnPrimary = { padding: '8px 12px', borderRadius: 8, background: '#3b82f6', color: '#fff', border: '1px solid #3b82f6', cursor: 'pointer', fontWeight: 500 };
const btnDisabled = { ...btnPrimary, background: '#9ca3af', cursor: 'not-allowed', margin: '5px' };
const modalBackdrop = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
  display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, zIndex: 1000
};
const modalCard = {
  background: '#fff', border: '1px solid #eee', borderRadius: 12, padding: 16,
  width: 'min(560px, 100%)', boxShadow: '0 10px 30px rgba(0,0,0,0.15)'
};
const btnDanger = { padding: '8px 12px', margin: '10px', borderRadius: 8, background: '#b91c1c', color: '#fff', border: 'none', cursor: 'pointer' };
