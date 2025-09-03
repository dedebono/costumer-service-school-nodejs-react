import { useState } from 'react';
import { api } from '../../lib/api.js';


export default function CreateUserForm() {
const [username, setUsername] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [role, setRole] = useState('CustomerService');
const [msg, setMsg] = useState('');


async function submit(e) {
e.preventDefault();
setMsg('');
try {
const data = await api('/api/users', { method: 'POST', body: { username, email, password, role } });
setMsg(`User created: ${data.user?.username || username}`);
setUsername(''); setEmail(''); setPassword(''); setRole('CustomerService');
} catch (e) { setMsg(`Error: ${e.message}`); }
}


return (
<form onSubmit={submit} style={{ background: '#fff', padding: 16, borderRadius: 12, border: '1px solid #eee', maxWidth: 600 }}>
<h3>Create Customer Service User</h3>
<div style={{ display: 'grid', gap: 8 }}>
<label>Username</label>
<input value={username} onChange={e => setUsername(e.target.value)} style={inStyle} />
<label>Email</label>
<input type="email" value={email} onChange={e => setEmail(e.target.value)} style={inStyle} />
<label>Password</label>
<input type="password" value={password} onChange={e => setPassword(e.target.value)} style={inStyle} />
<label>Role</label>
<select value={role} onChange={e => setRole(e.target.value)} style={inStyle}>
<option>CustomerService</option>
<option>Supervisor</option>
</select>
</div>
<button style={btn}>Create</button>
{msg && <p style={{ marginTop: 8, fontSize: 14 }}>{msg}</p>}
</form>
);
}


const inStyle = { border: '1px solid #ddd', borderRadius: 8, padding: 10 };
const btn = { marginTop: 10, padding: '10px 14px', background: '#111', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer' };