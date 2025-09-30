import { useState, useEffect } from 'react';
import { api } from '../../lib/api.js';
import Modal from '../../components/modal.jsx';
import Swal from 'sweetalert2';


export default function CreateUserForm() {
const [username, setUsername] = useState('');
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [role, setRole] = useState('CustomerService');
const [msg, setMsg] = useState('');

const [users, setUsers] = useState([]);
const [loading, setLoading] = useState(false);
const [editOpen, setEditOpen] = useState(false);
const [editUser, setEditUser] = useState({ id: '', username: '', email: '', role: '' });
const [changePasswordOpen, setChangePasswordOpen] = useState(false);
const [changePasswordUser, setChangePasswordUser] = useState({ id: '', username: '' });
const [newPassword, setNewPassword] = useState('');

async function fetchUsers() {
  setLoading(true);
  try {
    const data = await api('/api/users');
    setUsers(Array.isArray(data) ? data : []);
  } catch (e) {
    await Swal.fire({ icon: 'error', title: 'Fetch error', text: e.message || 'Unknown error' });
  } finally {
    setLoading(false);
  }
}

useEffect(() => {
  fetchUsers();
}, []);

async function submit(e) {
e.preventDefault();
setMsg('');
try {
const data = await api('/api/users', { method: 'POST', body: { username, email, password, role } });
setMsg(`User created: ${data.user?.username || username}`);
setUsername(''); setEmail(''); setPassword(''); setRole('CustomerService');
await fetchUsers(); // refresh list
} catch (e) { setMsg(`Error: ${e.message}`); }
}

// Edit functions
function openEdit(u) {
setEditUser({ id: u.id, username: u.username, email: u.email, role: u.role });
setEditOpen(true);
}
function closeEdit() {
setEditOpen(false);
setEditUser({ id: '', username: '', email: '', role: '' });
}
async function saveEdit(e) {
e.preventDefault();
try {
await api(`/api/users/${editUser.id}`, { method: 'PATCH', body: { username: editUser.username, email: editUser.email, role: editUser.role } });
await Swal.fire({ icon: 'success', title: 'User updated' });
closeEdit();
await fetchUsers();
} catch (e) {
await Swal.fire({ icon: 'error', title: 'Update failed', text: e.message || 'Unknown error' });
}
}

// Change Password functions
function openChangePassword(u) {
setChangePasswordUser({ id: u.id, username: u.username });
setNewPassword('');
setChangePasswordOpen(true);
}
function closeChangePassword() {
setChangePasswordOpen(false);
setChangePasswordUser({ id: '', username: '' });
setNewPassword('');
}
async function saveChangePassword(e) {
e.preventDefault();
if (!newPassword.trim()) {
await Swal.fire({ icon: 'error', title: 'Password required', text: 'Please enter a new password.' });
return;
}
try {
await api(`/api/users/${changePasswordUser.id}`, { method: 'PATCH', body: { password: newPassword } });
await Swal.fire({ icon: 'success', title: 'Password changed' });
closeChangePassword();
await fetchUsers();
} catch (e) {
await Swal.fire({ icon: 'error', title: 'Change failed', text: e.message || 'Unknown error' });
}
}

// Delete function
async function deleteUser(u) {
const res = await Swal.fire({
icon: 'warning',
title: 'Delete this user?',
html: `<div style="text-align:left"><b>${u.username}</b><br/>${u.email}<br/>Role: ${u.role}</div>`,
confirmButtonText: 'Delete',
cancelButtonText: 'Cancel',
showCancelButton: true,
confirmButtonColor: '#b91c1c',
});
if (!res.isConfirmed) return;
try {
await api(`/api/users/${u.id}`, { method: 'DELETE' });
await Swal.fire({ icon: 'success', title: 'User deleted' });
setUsers((curr) => curr.filter((x) => x.id !== u.id));
} catch (e) {
await Swal.fire({ icon: 'error', title: 'Delete failed', text: e.message || 'Unknown error' });
}
}


return (
<div className='container'>
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

{/* User List Table */}
<div>
<table
className='table'>
<th>
</th>
<tbody>
{loading ? (
<tr><td style={td} colSpan={4}>Loading…</td></tr>
) : users.length === 0 ? (
<tr><td style={td} colSpan={4}>No users found</td></tr>
) : (
users.map((u) => (
<tr key={u.id} style={{ borderTop: '1px solid #eee' }}>
<td style={td}>{u.username}</td>
<td style={td}>{u.email}</td>
<td style={td}>{u.role}</td>
<td style={td}>
<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
<button onClick={() => openEdit(u)} style={btnSecondary}>Edit</button>
<button onClick={() => openChangePassword(u)} style={btnSecondary}>Change Password</button>
<button onClick={() => deleteUser(u)} style={btnDanger}>Delete</button>
</div>
</td>
</tr>
))
)}
</tbody>
</table>
</div>

{/* Edit Modal */}
<Modal open={editOpen} title="Edit User" onClose={closeEdit}>
<form onSubmit={saveEdit}>
<div style={{ display: 'grid', gap: 8 }}>
<label>Username</label>
<input style={inp} value={editUser.username} onChange={(e) => setEditUser({ ...editUser, username: e.target.value })} />
<label>Email</label>
<input style={inp} type="email" value={editUser.email} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
<label>Role</label>
<select style={inp} value={editUser.role} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}>
<option>CustomerService</option>
<option>Supervisor</option>
</select>
</div>
<div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
<button type="button" onClick={closeEdit} style={btn}>Cancel</button>
<button type="submit" style={btnPrimary}>Save</button>
</div>
</form>
</Modal>

{/* Change Password Modal */}
<Modal open={changePasswordOpen} title={`Change Password for ${changePasswordUser.username}`} onClose={closeChangePassword}>
<form onSubmit={saveChangePassword}>
<div style={{ display: 'grid', gap: 8 }}>
<label>New Password</label>
<input style={inp} type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
</div>
<div style={{ display: 'flex', gap: 8, marginTop: 12, justifyContent: 'flex-end' }}>
<button type="button" onClick={closeChangePassword} style={btn}>Cancel</button>
<button type="submit" style={btnPrimary}>Change Password</button>
</div>
</form>
</Modal>
</div>
);
}


const inStyle = { border: '1px solid #ddd', borderRadius: 8, padding: 10 };
const btn = { marginTop: 10, padding: '10px 14px', background: '#111', color: '#fff', borderRadius: 8, border: 'none', cursor: 'pointer' };
const th = { padding: 8 };
const td = { padding: 8, verticalAlign: 'top' };
const inp = { border: '1px solid #ddd', borderRadius: 8, padding: '8px 10px' };
const btnPrimary = { padding: '8px 10px', borderRadius: 8, background: '#111', color: '#fff', border: 'none', cursor: 'pointer' };
const btnSecondary = { padding: '8px 10px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer' };
const btnDanger = { padding: '8px 10px', borderRadius: 8, background: '#b91c1c', color: '#fff', border: 'none', cursor: 'pointer' };
