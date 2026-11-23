import { useState } from 'react';
import { X, LogIn, UserPlus, AlertCircle } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { Button } from './Button';
import { backendAuthApi } from '../services/backendWorkspaceApi';

export function AuthModal({ initialMode = 'login', onClose, onAuthSuccess }) {
  const [mode, setMode] = useState(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data =
        mode === 'register'
          ? await backendAuthApi.register({ fullName, email, password })
          : await backendAuthApi.login({ email, password });

      onAuthSuccess?.(data);
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
            {mode === 'register' ? 'Create Your ELEVSKILL Account' : 'Sign In to ELEVSKILL AI'}
          </h2>
          {mode === 'login' && (
            <p className="text-small text-muted" style={{ margin: 0 }}>
              Access your saved career preparation workspace across sessions.
            </p>
          )}
        </div>

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

          <div className="form-field">
            <label className="form-label" htmlFor="auth-password">Password</label>
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

          <Button type="submit" variant="primary" disabled={loading} style={{ marginTop: '4px' }}>
            {mode === 'register' ? <UserPlus size={16} /> : <LogIn size={16} />}
            <span>
              {loading
                ? 'Please wait...'
                : mode === 'register'
                  ? 'Create Account'
                  : 'Sign In'}
            </span>
          </Button>
        </form>

        <div style={{ marginTop: '4px', textAlign: 'center', fontSize: '0.88rem' }}>
          {mode === 'register' ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError('');
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
