import { useState } from 'react';
import { X, LogIn, UserPlus, AlertCircle, CheckCircle2, Mail } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { Button } from './Button';
import {
  loginWithEmail,
  registerWithEmail,
  sendPasswordReset,
} from '../services/firebaseAuthService';

export function AuthModal({ initialMode = 'login', onClose, onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResetMessage('');
    setLoading(true);

    try {
      if (mode === 'reset') {
        await sendPasswordReset(email);
        setResetMessage('Password reset email sent. Please check your inbox.');
        return;
      }

      const user =
        mode === 'register'
          ? await registerWithEmail({ fullName, email, password })
          : await loginWithEmail({ email, password });

      onAuthSuccess?.({ user });
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Authentication failed. Please check your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="auth-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 70,
        background: 'rgba(38, 34, 51, 0.42)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-elevated)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <BrandLogo variant="full-tagline" size="sm" />
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            style={{
              padding: '6px',
              borderRadius: '8px',
              color: 'var(--text-muted)',
              background: 'transparent',
            }}
          >
            <X size={18} />
          </button>
        </div>

        <div>
          <h2 id="auth-modal-title" style={{ margin: '4px 0 6px', fontSize: '1.2rem' }}>
            {mode === 'register'
              ? 'Create Your ELEVSKILL Account'
              : mode === 'reset'
                ? 'Reset Your Password'
                : 'Sign In to ELEVSKILL AI'}
          </h2>
          {mode === 'login' && (
            <p className="text-small text-muted" style={{ margin: 0 }}>
              Access your saved career preparation workspace across sessions.
            </p>
          )}
          {mode === 'reset' && (
            <p className="text-small text-muted" style={{ margin: 0 }}>
              Enter your account email and we will send you a password reset link.
            </p>
          )}
        </div>

        {resetMessage && (
          <div
            role="status"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'rgba(22, 163, 74, 0.1)',
              color: '#15803d',
              fontSize: '0.88rem',
            }}
          >
            <CheckCircle2 size={16} />
            <span>{resetMessage}</span>
          </div>
        )}

        {error && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '10px 12px',
              borderRadius: '10px',
              background: 'rgba(220, 38, 38, 0.1)',
              color: '#b91c1c',
              fontSize: '0.88rem',
            }}
          >
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {mode === 'register' && (
            <div className="form-field">
              <label className="form-label" htmlFor="auth-fullname">Full Name</label>
              <input
                id="auth-fullname"
                type="text"
                className="form-input"
                required
                minLength={2}
                placeholder="e.g., Alex Morgan"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
              />
            </div>
          )}

          <div className="form-field">
            <label className="form-label" htmlFor="auth-email">Email Address</label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {mode !== 'reset' && (
            <div className="form-field">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" htmlFor="auth-password">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setError('');
                      setResetMessage('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-primary)',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <input
                id="auth-password"
                type="password"
                className="form-input"
                required
                minLength={8}
                placeholder="Minimum 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          <Button type="submit" variant="primary" disabled={loading} style={{ marginTop: '4px' }}>
            {mode === 'register' ? (
              <UserPlus size={16} />
            ) : mode === 'reset' ? (
              <Mail size={16} />
            ) : (
              <LogIn size={16} />
            )}
            <span>
              {loading
                ? 'Please wait...'
                : mode === 'register'
                  ? 'Create Account'
                  : mode === 'reset'
                    ? 'Send Reset Email'
                    : 'Sign In'}
            </span>
          </Button>
        </form>

        <div style={{ marginTop: '4px', textAlign: 'center', fontSize: '0.88rem' }}>
          {mode === 'register' || mode === 'reset' ? (
            <>
              {mode === 'reset' ? 'Remembered your password? ' : 'Already have an account? '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
                  setResetMessage('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
            </>
          ) : (
            <>
              New to ELEVSKILL AI?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError('');
                  setResetMessage('');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent-primary)',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Create an Account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
