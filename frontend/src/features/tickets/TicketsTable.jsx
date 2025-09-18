// src/features/tickets/TicketsTable.jsx
import { useEffect, useMemo, useState } from 'react';
import { api } from '../../lib/api.js';
import { qs, toLocalTime } from '../../lib/utils.js';

const STATUS_OPTIONS = ['open', 'in_progress', 'resolved', 'closed'];

/** ---- Follow-up prefix stripping (normalize title) ---- */
const numberedPrefixRegex = /^Follow\s*up\s*(\d+)\s*[xX]\s*:\s*/i;
const repeatCountRegex   = /^(?:Follow\s*up\s*:?\s*)+/i;
function normalizeTitle(raw) {
  let t = (raw || '').trim();
  if (!t) return '';
  if (numberedPrefixRegex.test(t)) return t.replace(numberedPrefixRegex, '').trim();
  if (repeatCountRegex.test(t))   return t.replace(repeatCountRegex, '').trim();
  return t;
}

/** ---- Priority badge helper ---- */
function PriorityBadge({ value }) {
  const v = String(value || '').toLowerCase();
  const normalized = v === 'normal' ? 'medium' : v; // backward-compat

  const stylesByPriority = {
    low:    { bg: '#dcfce7', text: '#14532d', border: '#86efac' }, // light green
    medium: { bg: '#bbf7d0', text: '#14532d', border: '#86efac' }, // green
    high:   { bg: '#ffedd5', text: '#9a3412', border: '#fdba74' }, // orange
    urgent: { bg: '#fee2e2', text: '#991b1b', border: '#fca5a5' }, // red
    default:{ bg: '#e5e7eb', text: '#374151', border: '#d1d5db' },
  };

  const c = stylesByPriority[normalized] || stylesByPriority.default;

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: 9999,
        fontSize: 12,
        fontWeight: 600,
        background: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
        textTransform: 'capitalize',
      }}
      title={v}
    >
      {v || '-'}
    </span>
  );
}

export default function TicketsTable({ supervisor }) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [q, setQ] = useState('');

  // NEW: base title filter state
  const [baseTitle, setBaseTitle] = useState('');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState({}); // { [ticketId]: boolean }
  const pages = useMemo(() => Math.ceil(total / pageSize) || 1, [total, pageSize]);

  // Build available base titles from currently loaded items
  const baseTitleOptions = useMemo(() => {
    const s = new Set();
    for (const it of items) {
      const b = normalizeTitle(it.title);
      if (b) s.add(b);
    }
    return Array.from(s).sort((a, b) => a.localeCompare(b));
  }, [items]);

  async function load() {
    setLoading(true);
    try {
      // Combine free-text q and selected base title into one search string
      const qSearch = [q, baseTitle].filter(Boolean).join(' ').trim();
      const data = await api(
        `/api/tickets${qs({ status, priority, q: qSearch, page, pageSize, sortBy: 'created_at', sortDir: 'DESC' })}`
      );
      setItems(data.data || []);
      setTotal(data.pagination?.total || 0);
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load(); // eslint-disable-next-line
  }, [page, pageSize]);

  async function onDelete(id) {
    if (!confirm(`Delete ticket ${id}?`)) return;
    try {
      await api(`/api/tickets/${id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      alert(e.message);
    }
  }

  async function onChangeStatus(ticket, nextStatus) {
    if (!ticket.id) return;
    const prevStatus = ticket.status;

    setItems(curr =>
      curr.map(it => (it.id === ticket.id ? { ...it, status: nextStatus } : it))
    );
    setSaving(s => ({ ...s, [ticket.id]: true }));

    try {
      await api(`/api/tickets/${ticket.id}/status`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });
    } catch (e) {
      setItems(curr =>
        curr.map(it => (it.id === ticket.id ? { ...it, status: prevStatus } : it))
      );
      alert(e.message);
    } finally {
      setSaving(s => {
        const c = { ...s };
        delete c[ticket.id];
        return c;
      });
    }
  }

  function exportToCSV() {
    const header = ['ID', 'Title', 'Customer Name', 'Phone', 'Description', 'Priority', 'Status', 'Created By', 'Created At'];

    const rows = items.map(item => [
      escapeCSV(item.id),
      escapeCSV(item.title),
      escapeCSV(item.customer_name),
      escapeCSV(item.customer_phone),
      escapeCSV(item.description),
      escapeCSV(item.priority),
      escapeCSV(item.status),
      escapeCSV(item.created_by_username ?? item.created_by),
      escapeCSV(toLocalTime(item.created_at)),
    ]);

    const csvContent = [header, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', 'tickets.csv');
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }

  function escapeCSV(value) {
    if (value == null) return '';
    let str = value.toString();
    str = str.replace(/"/g, '""');
    if (str.includes(',') || str.includes('\n') || str.includes('"')) {
      str = `"${str}"`;
    }
    return str;
  }

  const COLS = supervisor ? 10 : 9;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by name / phone / title"
          style={inp}
        />

        {/* NEW: Title (base) dropdown built from current items, ignoring 'Follow up Xx:' */}
        <select
          value={baseTitle}
          onChange={(e) => { setBaseTitle(e.target.value); setPage(1); }}
          style={inp}
          title="Filter by base title (ignores 'Follow up Xx:' prefixes)"
        >
          <option value="">All Titles</option>
          {baseTitleOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <select value={status} onChange={(e) => setStatus(e.target.value)} style={inp}>
          <option value="">All Status</option>
          <option value="open">open</option>
          <option value="in_progress">in_progress</option>
          <option value="resolved">resolved</option>
          <option value="closed">closed</option>
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} style={inp}>
          <option value="">All Priority</option>
          <option value="low">low</option>
          <option value="medium">medium</option>
          <option value="high">high</option>
          <option value="urgent">urgent</option>
        </select>

        <button
          onClick={() => {
            setPage(1);
            load();
          }}
          style={btn}
        >
          Apply
        </button>
        <button onClick={exportToCSV} style={btn}>Export to CSV</button>
      </div>

      <div style={{ border: '1px solid #eee', borderRadius: 8, overflow: 'auto' }}>
        <table style={{ width: '100%', fontSize: 12, minWidth: 980 }}>
          <thead style={{ background: '#f3f4f6', textAlign: 'left' }}>
            <tr>
              <th style={th}>ID</th>
              <th style={th}>Title</th>
              <th style={th}>Customer Name</th>
              <th style={th}>Phone</th>
              <th style={th}>Description</th>
              <th style={th}>Priority</th>
              <th style={th}>Status</th>
              <th style={th}>Created By</th>
              <th style={th}>Created At</th>
              {supervisor && <th style={th}>Actions</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td style={td} colSpan={COLS}>Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td style={td} colSpan={COLS}>No tickets</td>
              </tr>
            ) : (
              items.map((t, i) => (
                <tr key={t.id ?? `row-${i}`} style={{ borderTop: '1px solid #eee' }}>
                  <td style={td}>{t.id ?? '-'}</td>
                  <td style={td}>{t.title}</td>
                  <td style={td}>{t.customer_name || '-'}</td>
                  <td style={td}>{t.customer_phone || '-'}</td>
                  <td
                    style={{ ...td, maxWidth: 360, overflow: 'auto', whiteSpace: 'normal', wordWrap: 'break-word' }}
                    title={t.description || ''}
                  >
                    {t.description}
                  </td>
                  <td style={td}>
                    <PriorityBadge value={t.priority} />
                  </td>
                  <td style={td}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <select
                        value={t.status}
                        disabled={!t.id || saving[t.id]}
                        onChange={(e) => onChangeStatus(t, e.target.value)}
                        style={inp}
                      >
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                      {saving[t.id] && <span style={{ fontSize: 12, color: '#666' }}>saving…</span>}
                    </div>
                  </td>
                  <td style={td}>{t.created_by_username ?? t.created_by ?? '-'}</td>
                  <td style={td}>{toLocalTime(t.created_at)}</td>
                  {supervisor && (
                    <td style={td}>
                      <button onClick={() => onDelete(t.id)} style={delBtn} disabled={!t.id}>
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
        <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={navBtn}>
          Prev
        </button>
        <span style={{ fontSize: 12 }}>
          Page {page} / {pages}
        </span>
        <button disabled={page >= pages} onClick={() => setPage((p) => p + 1)} style={navBtn}>
          Next
        </button>
        <select
          value={pageSize}
          onChange={(e) => {
            setPageSize(parseInt(e.target.value, 10));
            setPage(1);
          }}
          style={{ marginLeft: 'auto', ...inp }}
        >
          {[10, 20, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n}/page
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function truncate(s, n) {
  if (!s) return '-';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

const inp = { border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px' };
const btn = { padding: '8px 12px', background: '#111', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer' };
const th = { padding: 8 };
const td = { padding: 8, verticalAlign: 'top' };
const navBtn = { padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' };
const delBtn = { padding: '6px 10px', borderRadius: 8, border: 'none', background: '#dc2626', color: '#fff', cursor: 'pointer' };
