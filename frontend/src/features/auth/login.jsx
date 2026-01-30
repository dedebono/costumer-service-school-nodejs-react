import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

// Generate a simple math captcha
function generateCaptcha() {
  const operators = ['+', '-', '×'];
  const operator = operators[Math.floor(Math.random() * operators.length)];
  let num1, num2, answer;

  switch (operator) {
    case '+':
      num1 = Math.floor(Math.random() * 20) + 1;
      num2 = Math.floor(Math.random() * 20) + 1;
      answer = num1 + num2;
      break;
    case '-':
      num1 = Math.floor(Math.random() * 20) + 10;
      num2 = Math.floor(Math.random() * 10) + 1;
      answer = num1 - num2;
      break;
    case '×':
      num1 = Math.floor(Math.random() * 10) + 1;
      num2 = Math.floor(Math.random() * 10) + 1;
      answer = num1 * num2;
      break;
    default:
      num1 = 5;
      num2 = 3;
      answer = 8;
  }

  return {
    question: `${num1} ${operator} ${num2} = ?`,
    answer: answer
  };
}

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Admin#12345');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  // Captcha state
  const [showCaptcha, setShowCaptcha] = useState(false);
  const [captcha, setCaptcha] = useState(null);
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaErr, setCaptchaErr] = useState('');

  // Handle initial form submit - show captcha
  function onSubmit(e) {
    e.preventDefault();
    setErr('');

    // Basic validation
    if (!email || !password) {
      setErr('Please enter email and password');
      return;
    }

    // Generate captcha and show modal
    setCaptcha(generateCaptcha());
    setCaptchaInput('');
    setCaptchaErr('');
    setShowCaptcha(true);
  }

  // Handle captcha verification and actual login
  async function verifyCaptchaAndLogin() {
    const userAnswer = parseInt(captchaInput, 10);

    if (isNaN(userAnswer)) {
      setCaptchaErr('Please enter a number');
      return;
    }

    if (userAnswer !== captcha.answer) {
      setCaptchaErr('Incorrect answer. Try again!');
      setCaptcha(generateCaptcha());
      setCaptchaInput('');
      return;
    }

    // Captcha passed - proceed with login
    setShowCaptcha(false);
    setBusy(true);

    try {
      await login(email, password);
      const userData = JSON.parse(localStorage.getItem('user'));
      const destination = userData?.role === 'Supervisor' ? '/supervisor' : '/cs';
      navigate(destination, { replace: true });
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  // Regenerate captcha
  function refreshCaptcha() {
    setCaptcha(generateCaptcha());
    setCaptchaInput('');
    setCaptchaErr('');
  }

  // Close captcha modal
  function closeCaptcha() {
    setShowCaptcha(false);
    setCaptchaInput('');
    setCaptchaErr('');
  }

  return (
    <div className="kiosk-page">
      <div className="center" style={{
        minHeight: '100vh',
        display: 'grid', placeItems: 'center',
      }}>
        <form onSubmit={onSubmit} className="kiosk-content" style={{
          width: 330,
          minHeight: '200px',
          opacity: '100%',
          backgroundColor: 'white',
          padding: '2rem',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <h2 className="mb-3" style={{ color: '#143258' }}>Staff Login</h2>
          <label className="block mb-1" style={{ color: 'black', display: 'none' }}>Email</label>
          <input
            className="input mb-3"
            style={{ color: 'black' }}
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <label className="block mb-1" style={{ color: 'black', display: 'none' }}>Password</label>
          <input
            className="input mb-3"
            type="password"
            style={{ color: 'black' }}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="*********"
          />
          {err && <div style={{
            color: '#b00020', fontSize: '0.875rem', marginBottom: '0.75rem', textAlign: 'center'
          }}>{err}</div>}
          <button disabled={busy} className="btn btn--primary w-full">
            {busy ? 'Signing in…' : 'Sign In'}
          </button>
          <div style={{ marginTop: '1rem', textAlign: 'center' }}>
            <Link to="/" style={{ color: '#264da1', fontSize: '0.9rem' }}>← Back to Home</Link>
          </div>
        </form>
      </div>

      {/* Captcha Modal */}
      {showCaptcha && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'grid',
          placeItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            width: 330,
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
          }}>
            <h2 className="mb-3" style={{ color: '#143258' }}>Verify You're Human</h2>
            <p style={{ color: '#666', fontSize: '0.9rem', marginBottom: '1rem' }}>
              Solve: <strong style={{ color: '#143258', fontSize: '1.1rem' }}>{captcha?.question}</strong>
            </p>
            <input
              type="number"
              className="input mb-3"
              value={captchaInput}
              onChange={e => setCaptchaInput(e.target.value)}
              onKeyPress={e => e.key === 'Enter' && verifyCaptchaAndLogin()}
              placeholder="Your answer"
              autoFocus
              style={{ color: 'black' }}
            />
            {captchaErr && <div style={{
              color: '#b00020', fontSize: '0.875rem', marginBottom: '0.75rem', textAlign: 'center'
            }}>{captchaErr}</div>}
            <button
              type="button"
              onClick={verifyCaptchaAndLogin}
              className="btn btn--primary w-full"
            >
              Verify & Login
            </button>
            <div style={{ marginTop: '1rem', textAlign: 'center' }}>
              <button
                type="button"
                onClick={closeCaptcha}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#264da1',
                  fontSize: '0.9rem',
                  cursor: 'pointer'
                }}
              >
                ← Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

