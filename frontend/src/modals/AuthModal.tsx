import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/appStore';
import ModalHeader from '../components/ModalHeader';

export default function AuthModal({ mode: initialMode }: { mode: 'login' | 'register' }) {
  const login = useAppStore((s) => s.login);
  const register = useAppStore((s) => s.register);
  const closeModal = useAppStore((s) => s.closeModal);
  const showToast = useAppStore((s) => s.showToast);
  const navigate = useNavigate();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const action = mode === 'login' ? login : register;
    const result = await action(email, password);
    setSubmitting(false);
    if (result.ok) {
      closeModal();
      showToast(mode === 'login' ? 'Welcome back' : 'Welcome to LOOM');
      // Admins are never self-registered, so this only ever fires on login.
      if (useAppStore.getState().auth?.role === 'ADMIN') navigate('/admin');
    } else {
      setError(result.message);
    }
  };

  return (
    <>
      <ModalHeader title={mode === 'login' ? 'Log in' : 'Create your account'} />
      <div className="filter-block">
        <label className="address-label" htmlFor="auth-email">
          Email
        </label>
        <input
          id="auth-email"
          className="address-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
        />
        <label className="address-label" htmlFor="auth-password" style={{ marginTop: 12 }}>
          Password
        </label>
        <input
          id="auth-password"
          className="address-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        />
        {mode === 'register' && <p className="address-hint">At least 8 characters.</p>}
        {error && (
          <p style={{ color: '#c0392b', fontSize: 13, marginTop: 8 }} role="alert">
            {error}
          </p>
        )}
      </div>
      <div className="modal-actions">
        <button className="primary-button" onClick={submit} disabled={submitting || !email || !password}>
          {submitting ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
        </button>
      </div>
      <button
        className="outline-button"
        style={{ margin: '0 20px 20px' }}
        onClick={() => {
          setMode(mode === 'login' ? 'register' : 'login');
          setError(null);
        }}
      >
        {mode === 'login' ? 'New here? Create an account' : 'Already have an account? Log in'}
      </button>
    </>
  );
}
