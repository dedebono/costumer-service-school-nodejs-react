export function qs(obj) {
const p = Object.entries(obj)
.filter(([, v]) => v !== undefined && v !== null && v !== '')
.map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
.join('&');
return p ? `?${p}` : '';
}


export function fmtDate(s) {
if (!s) return '-';
try { return new Date(s).toLocaleString(); } catch { return s; }
}