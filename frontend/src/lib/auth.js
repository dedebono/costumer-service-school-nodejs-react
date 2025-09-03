export function setToken(t) { localStorage.setItem('token', t); }
export function getToken() { return localStorage.getItem('token') || ''; }
export function clearToken() { localStorage.removeItem('token'); }


export function setUser(u) { localStorage.setItem('user', JSON.stringify(u)); }
export function getUser() {
const raw = localStorage.getItem('user');
try { return raw ? JSON.parse(raw) : null; } catch { return null; }
}
export function clearUser() { localStorage.removeItem('user'); }