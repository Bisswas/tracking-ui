import { useState } from 'react';
import { login, register, setToken } from '../api.js';

export default function AuthPage({ onAuth }) {
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password) return setError('Enter your email and password');
    if (mode === 'register' && password.length < 8) return setError('Password must be at least 8 characters');

    setBusy(true);
    try {
      const result =
        mode === 'login' ? await login(email.trim(), password) : await register(email.trim(), password, name.trim());
      setToken(result.token);
      onAuth(result.user);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <form className="auth-card" onSubmit={submit}>
        <div className="auth-logo">📍</div>
        <h1>Live Tracker</h1>
        <p className="muted">{mode === 'login' ? 'Log in to see your devices' : 'Create your account'}</p>

        {mode === 'register' && (
          <label className="field">
            <span>Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={100} />
          </label>
        )}
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" autoFocus />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </label>

        {error && <div className="form-error">{error}</div>}

        <button className="btn primary wide" disabled={busy}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
        {busy && <p className="muted small">The free server can take up to a minute to wake up.</p>}

        <button
          type="button"
          className="link"
          onClick={() => {
            setMode(mode === 'login' ? 'register' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'No account yet? Sign up' : 'Already have an account? Log in'}
        </button>
      </form>
    </div>
  );
}
