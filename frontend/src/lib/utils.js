export function qs(obj) {
const p = Object.entries(obj)
.filter(([, v]) => v !== undefined && v !== null && v !== '')
.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
.join('&');
return p ? `?${p}` : '';
}


// src/lib/utils.js
export function toLocalTime(input, { showSeconds = false, assumeUTC = true } = {}) {
  if (!input) return '-';
  const s = String(input).trim();
  let d;

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(s)) {
    d = new Date(s.replace(' ', 'T') + (assumeUTC ? 'Z' : '')); // <- toggle
  } else {
    d = new Date(s);
  }
  if (isNaN(d)) return String(input);

  const opts = { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit', hour12:false };
  if (showSeconds) opts.second = '2-digit';
  return d.toLocaleString(undefined, opts);
}
