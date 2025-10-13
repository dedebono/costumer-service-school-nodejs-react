import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Login() {
  const { login, user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      const destination = user.role === 'Supervisor' ? '/supervisor' : '/cs';
      navigate(destination, { replace: true });
    }
  }, [user, navigate]);
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
<div className="kiosk-page" >
<div className="center" style={{ minHeight: '100vh', 
  display: 'grid', placeItems: 'center' , }}>
<form onSubmit={onSubmit} className="kiosk-content" style={{ width: 330 , opacity: '100%', backgroundColor: 'white', padding: '2rem', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'}}>
<h2 className="mb-3">Login</h2>
<label className="block mb-1" style={{color:'black' , display:'none'}}>Email</label>
<input className="input mb-3" style={{color:'black'}} value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
<label className="block mb-1" style={{color:'black' , display:'none' }}>Password</label>
<input className="input mb-3" type="password" style={{color:'black'}} value={password} onChange={e => setPassword(e.target.value)} placeholder="*********" />
{err && <div style={{ color: '#b00020', fontSize: '0.875rem', marginBottom: '0.75rem' , textAlign: 'center'
 }}>{err}</div>}
<button disabled={busy} className="btn btn--primary w-full">{busy ? 'Signing in…' : 'Sign In'}</button>
</form>
</div>
</div>
);
}



