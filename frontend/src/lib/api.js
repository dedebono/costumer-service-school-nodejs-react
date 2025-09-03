const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3000';


function getToken() {
return localStorage.getItem('token') || '';
}


export async function api(path, { method = 'GET', body, headers } = {}) {
const token = getToken();
const resp = await fetch(`${API_BASE}${path}`, {
method,
headers: {
'Content-Type': 'application/json',
...(token ? { Authorization: `Bearer ${token}` } : {}),
...(headers || {}),
},
body: body ? JSON.stringify(body) : undefined,
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