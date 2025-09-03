import { useState } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';


export default function Login() {
const { login } = useAuth();
const [email, setEmail] = useState('admin@example.com');
const [password, setPassword] = useState('Admin#12345');
const [err, setErr] = useState('');
const [busy, setBusy] = useState(false);


async function onSubmit(e) {
e.preventDefault();
setErr('');
setBusy(true);
try {
await login(email, password);
} catch (e) {
setErr(e.message);
} finally { setBusy(false); }
}


return (
<div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#f6f6f6' }}>
<form onSubmit={onSubmit} style={{ width: 360, background: '#fff', padding: 24, borderRadius: 12, boxShadow: '0 2px 10px rgba(0,0,0,.06)' }}>
<h2 style={{ marginBottom: 12 }}>Login</h2>
<label>Email</label>
<input value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" style={inputStyle} />
<label>Password</label>
<input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" style={inputStyle} />
{err && <div style={{ color: '#b00020', fontSize: 12, marginTop: 6 }}>{err}</div>}
<button disabled={busy} style={buttonStyle}>{busy ? 'Signing in…' : 'Sign In'}</button>
</form>
</div>
);
}


const inputStyle = { width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: 10, margin: '6px 0 12px' };
const buttonStyle = { width: '100%', background: '#111', color: '#fff', padding: 10, borderRadius: 8, border: 'none', cursor: 'pointer' };