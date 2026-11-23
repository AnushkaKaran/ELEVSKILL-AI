import { useState } from 'react';
import { Save, Check } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import './pages.css';

const THEME_OPTIONS = [
  { id: 'lavender', label: 'Classic Lavender Pastel (Default)' },
  { id: 'blossom', label: 'Soft Rose & Pink Pastel' },
  { id: 'sky', label: 'Powder Blue & Mint Pastel' },
];

export function Settings({ userProfile, onSaveProfile, onResetAll, isAuthenticated = false }) {
  const [formState, setFormState] = useState({ ...userProfile });
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');

  const handleChange = (field, value) => {
    const next = { ...formState, [field]: value };
    setFormState(next);
    setSavedNotice(false);
    if (field === 'themeVariant') {
      document.documentElement.setAttribute('data-theme', value);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const combinedEdu =
      formState.education.trim() ||
      [
        formState.degree?.trim(),
        formState.institution?.trim(),
        formState.graduationYear?.trim() ? `Class of ${formState.graduationYear.trim()}` : '',
      ]
        .filter(Boolean)
        .join(' · ');

    onSaveProfile({
      ...formState,
      name: formState.name.trim(),
      email: formState.email.trim(),
      education: combinedEdu,
      degree: (formState.degree || '').trim(),
      institution: (formState.institution || '').trim(),
      graduationYear: (formState.graduationYear || '').trim(),
      targetRole: formState.targetRole.trim(),
      skills: (formState.skills || '').trim(),
      careerInterests: (formState.careerInterests || '').trim(),
    });
    setSavedNotice(true);
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="grid-2">
        <Card
          title="User Profile & Preferences"
          subtitle={
            isAuthenticated
              ? 'Synchronized with your ELEVSKILL account (SQL Server)'
              : 'Stored locally in your current browser (Guest Mode)'
          }
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-field">
              <label className="form-label" htmlFor="pref-name">
                Full Name
              </label>
              <input
                id="pref-name"
                type="text"
                className="form-input"
                placeholder="Enter your full name"
                value={formState.name}
                onChange={(e) => handleChange('name', e.target.value)}
              />
            </div>

            <div className="grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="pref-degree">
                  Degree / Program (Optional)
                </label>
                <input
                  id="pref-degree"
                  type="text"
                  className="form-input"
                  placeholder="e.g., B.S. Computer Science"
                  value={formState.degree || ''}
                  onChange={(e) => handleChange('degree', e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="pref-year">
                  Graduation Year (Optional)
                </label>
                <input
                  id="pref-year"
                  type="text"
                  className="form-input"
                  placeholder="e.g., 2026"
                  value={formState.graduationYear || ''}
                  onChange={(e) => handleChange('graduationYear', e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="pref-institution">
                  Institution (Optional)
                </label>
                <input
                  id="pref-institution"
                  type="text"
                  className="form-input"
                  placeholder="e.g., State University"
                  value={formState.institution || ''}
                  onChange={(e) => handleChange('institution', e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="pref-education">
                  Education Summary (Optional)
                </label>
                <input
                  id="pref-education"
                  type="text"
                  className="form-input"
                  placeholder="e.g., B.S. Computer Science (Class of 2026)"
                  value={formState.education}
                  onChange={(e) => handleChange('education', e.target.value)}
                />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-field">
                <label className="form-label" htmlFor="pref-skills">
                  Current Skills (Optional)
                </label>
                <input
                  id="pref-skills"
                  type="text"
                  className="form-input"
                  placeholder="e.g., Python, React, SQL"
                  value={formState.skills || ''}
                  onChange={(e) => handleChange('skills', e.target.value)}
                />
              </div>

              <div className="form-field">
                <label className="form-label" htmlFor="pref-interests">
                  Career Interests (Optional)
                </label>
                <input
                  id="pref-interests"
                  type="text"
                  className="form-input"
                  placeholder="e.g., Full-Stack, AI/ML"
                  value={formState.careerInterests || ''}
                  onChange={(e) => handleChange('careerInterests', e.target.value)}
                />
              </div>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="pref-email">
                Student / Personal Email
              </label>
              <input
                id="pref-email"
                type="email"
                className="form-input"
                placeholder="you@university.edu"
                value={formState.email}
                onChange={(e) => handleChange('email', e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="pref-role">
                Target Job Role
              </label>
              <input
                id="pref-role"
                type="text"
                className="form-input"
                placeholder="e.g., Junior Frontend Developer"
                value={formState.targetRole}
                onChange={(e) => handleChange('targetRole', e.target.value)}
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="pref-level">
                Career Experience Level
              </label>
              <select
                id="pref-level"
                className="form-select"
                value={formState.experienceLevel}
                onChange={(e) => handleChange('experienceLevel', e.target.value)}
              >
                <option value="">Select experience level</option>
                <option value="Student">Student</option>
                <option value="Fresher">Fresher</option>
                <option value="Experienced">Experienced</option>
                <option value="Student / Seeking Internship">Student / Seeking Internship</option>
                <option value="Fresh Graduate / Internship">Fresh Graduate / Internship</option>
                <option value="Entry-Level (0–1 yrs)">Entry-Level (0–1 yrs)</option>
              </select>
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="pref-theme">
                Light Pastel Theme Palette
              </label>
              <select
                id="pref-theme"
                className="form-select"
                value={formState.themeVariant || 'lavender'}
                onChange={(e) => handleChange('themeVariant', e.target.value)}
              >
                {THEME_OPTIONS.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="toggle-row">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.92rem' }}>Weekly Progress Digest</div>
                  <div className="text-small text-muted">
                    Preference flag for future email summaries
                  </div>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={formState.emailNotifications}
                  className={`toggle-switch ${formState.emailNotifications ? 'on' : ''}`}
                  onClick={() => handleChange('emailNotifications', !formState.emailNotifications)}
                >
                  <span className="toggle-knob" />
                </button>
              </div>
            </div>

            <div className="action-row" style={{ marginTop: '4px' }}>
              <Button type="submit" variant="primary">
                {savedNotice ? <Check size={16} /> : <Save size={16} />}
                {savedNotice ? 'Preferences Saved' : 'Save Preferences'}
              </Button>
              {!confirmReset ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setResetError('');
                    setConfirmReset(true);
                  }}
                >
                  Reset All User Data
                </Button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span className="text-small" style={{ color: 'var(--danger)' }}>
                    Clear all profile, resume, and roadmap data?
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={isResetting}
                    onClick={async () => {
                      setResetError('');
                      setIsResetting(true);
                      try {
                        await onResetAll();
                        setConfirmReset(false);
                      } catch (err) {
                        setResetError(
                          err?.message || 'Failed to reset account data. Please ensure the backend server is running.'
                        );
                      } finally {
                        setIsResetting(false);
                      }
                    }}
                  >
                    {isResetting ? 'Resetting...' : 'Confirm Reset'}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isResetting}
                    onClick={() => setConfirmReset(false)}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
            {resetError && (
              <div className="validation-error" role="alert">
                {resetError}
              </div>
            )}
          </form>
        </Card>

        <Card
          title="Application Information"
          subtitle="ELEVSKILL AI · Build Skills. Elevate Your Future."
          action={<Badge variant="purple">v1.0.0</Badge>}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="rec-card">
              <div className="rec-top">
                <span style={{ fontWeight: 700 }}>ELEVSKILL AI</span>
                <Badge variant="blue">Privacy-First Workspace</Badge>
              </div>
              <p className="rec-desc">
                An intelligent career preparation platform for students and early-career professionals
                to analyze and build resumes, practice interviews, track study hours, and plan skill roadmaps.
              </p>
            </div>

            <div className="rec-card">
              <h4 className="rec-title">Privacy & Session Persistence</h4>
              <ul className="feedback-list">
                <li>
                  <span className="feedback-dot" />
                  <span>
                    Profile completion is optional — explore all tools immediately or save preferences anytime.
                  </span>
                </li>
                <li>
                  <span className="feedback-dot" />
                  <span>
                    Uploaded resumes stay temporary unless you explicitly choose to save them to your Resume Vault.
                  </span>
                </li>
                <li>
                  <span className="feedback-dot" />
                  <span>
                    {isAuthenticated
                      ? 'Your account data is synchronized with the ELEVSKILL backend and persisted in SQL Server across sessions.'
                      : 'Guest data is stored locally in your current browser session and may not persist across devices or cleared storage.'}
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
