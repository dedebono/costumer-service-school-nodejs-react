const API_BASE = import.meta.env.VITE_API_BASE || '/api';
export const get = (p, init) => fetch(`${API_BASE}${p}`, init);


function getToken() {
return localStorage.getItem('token') || '';
}


export async function api(path, { method = 'GET', body, headers } = {}) {
const token = getToken();

const isFormData = body instanceof FormData;

const resp = await fetch(`${API_BASE}${path}`, {
method,
headers: {
// Let browser set Content-Type for FormData
...(isFormData ? {} : { 'Content-Type': 'application/json' }),
...(token ? { Authorization: `Bearer ${token}` } : {}),
...(headers || {}),
},
body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
});

if (!resp.ok) {
let msg = `${resp.status} ${resp.statusText}`;
try {
const j = await resp.json();
throw new Error(j.error || j.message || msg);
} catch (e) {
if (e instanceof SyntaxError) throw new Error(msg);
throw e;
}
}
const text = await resp.text();
try { return text ? JSON.parse(text) : {}; } catch { return text; }
}