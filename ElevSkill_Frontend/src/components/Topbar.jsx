import { useState } from 'react';
import { Menu, LogIn, LogOut, UserPlus, AlertTriangle, X } from 'lucide-react';
import { Badge } from './Badge';
import { Button } from './Button';

export function Topbar({
  title,
  subtitle,
  userProfile,
  authUser,
  onOpenMenu,
  onOpenAuth,
  onOpenSettings,
  onLogout,
  onStartNewGuestSession,
}) {
  const [confirmNewGuest, setConfirmNewGuest] = useState(false);

  const displayName =
    authUser?.fullName?.trim() || userProfile?.name?.trim() || 'Guest User';
  const displayRole =
    userProfile?.targetRole?.trim() || 'Set target role in Settings';

  const initials = displayName !== 'Guest User'
    ? displayName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part[0].toUpperCase())
        .join('')
    : 'ES';

  return (
    <>
      <header className="topbar">
        <div className="topbar-left">
          <button
            type="button"
            className="mobile-menu-btn"
            onClick={onOpenMenu}
            aria-label="Open navigation menu"
          >
            <Menu size={20} />
          </button>
          <div>
            <h1 className="topbar-title">{title}</h1>
            {subtitle && <p className="topbar-subtitle">{subtitle}</p>}
          </div>
        </div>

        <div className="topbar-right">
          {authUser && <Badge variant="success">Signed In</Badge>}
          <button
            type="button"
            className="user-pill user-pill-btn"
            onClick={onOpenSettings}
            title="Open Profile Settings"
            aria-label={`${displayName} — open Profile Settings`}
          >
            <div className="user-avatar" aria-hidden="true">
              {initials}
            </div>
            <div className="user-meta">
              <span className="user-name">{displayName}</span>
              <span className="user-role">{displayRole}</span>
            </div>
          </button>
          {authUser ? (
            <Button variant="secondary" size="sm" onClick={onLogout} title="Sign out">
              <LogOut size={15} />
              <span>Sign Out</span>
            </Button>
          ) : (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setConfirmNewGuest(true)}
                title="Start a fresh isolated guest workspace"
              >
                <UserPlus size={15} />
                <span className="hide-mobile-label">New Guest Session</span>
              </Button>
              <Button variant="primary" size="sm" onClick={onOpenAuth}>
                <LogIn size={15} />
                <span>Sign In</span>
              </Button>
            </>
          )}
        </div>
      </header>

      {confirmNewGuest && !authUser && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="new-guest-title"
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
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-elevated)',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(109, 40, 217, 0.1)',
                    color: 'var(--accent-primary)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={18} />
                </span>
                <h3 id="new-guest-title" style={{ margin: 0, fontSize: '1.05rem' }}>
                  Start New Guest Session
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmNewGuest(false)}
                aria-label="Cancel new guest session"
                style={{ padding: '6px', borderRadius: '8px', color: 'var(--text-muted)', background: 'transparent' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Starting a new guest session will permanently clear the current browser guest workspace (profile, saved resumes, interview history, and roadmap progress) and open a fresh setup. Authenticated accounts are not affected.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <Button type="button" variant="ghost" onClick={() => setConfirmNewGuest(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setConfirmNewGuest(false);
                  onStartNewGuestSession?.();
                }}
              >
                <UserPlus size={14} /> Start New Guest Session
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
