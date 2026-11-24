import { useState, useEffect, useRef } from 'react';
import { Save, Check, Download, Upload, AlertTriangle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { validateWorkspaceBackup } from '../utils/indexedDbStore';
import './pages.css';

const THEME_OPTIONS = [
  { id: 'lavender', label: 'Classic Lavender Pastel (Default)' },
  { id: 'blossom', label: 'Soft Rose & Pink Pastel' },
  { id: 'sky', label: 'Powder Blue & Mint Pastel' },
];

export function Settings({
  userProfile,
  onSaveProfile,
  onResetAll,
  onExportBackup,
  onImportBackup,
  isAuthenticated = false,
}) {
  const [formState, setFormState] = useState({ ...userProfile });
  const [savedNotice, setSavedNotice] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetError, setResetError] = useState('');
  const [backupStatus, setBackupStatus] = useState('');
  const [backupError, setBackupError] = useState('');
  const [pendingBackup, setPendingBackup] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const backupFileInputRef = useRef(null);

  useEffect(() => {
    setFormState({ ...userProfile });
  }, [userProfile]);

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
              ? 'Stored locally in this browser (isolated to your Firebase account)'
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
                          err?.message || 'Failed to reset browser workspace data.'
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
                      ? 'Your signed-in workspace is stored in IndexedDB on this browser and isolated to your Firebase UID. Data is local to this browser and does not automatically sync across devices.'
                      : 'Guest data is stored in IndexedDB on this browser under the guest workspace and does not automatically sync across devices.'}
                  </span>
                </li>
              </ul>
            </div>

            <div className="rec-card">
              <h4 className="rec-title">Workspace Backup &amp; Restore (JSON)</h4>
              <p className="text-small text-muted" style={{ marginBottom: '12px' }}>
                Export your active workspace (profile, resume text, analyses, drafts, interview history, job matches, roadmap, and activity) as JSON, or restore from a backup file. Note: raw PDF binary Blobs are not included in JSON backups.
              </p>
              <div className="action-row">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={async () => {
                    setBackupError('');
                    setBackupStatus('');
                    try {
                      const backup = await onExportBackup?.();
                      if (!backup) return;
                      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      const datePart = new Date().toISOString().slice(0, 10);
                      a.href = url;
                      a.download = `elevskill-backup-${backup.ownerId || 'workspace'}-${datePart}.json`;
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      setTimeout(() => URL.revokeObjectURL(url), 1000);
                      setBackupStatus('Workspace backup exported as JSON (PDF binary Blobs excluded).');
                    } catch (err) {
                      setBackupError(err?.message || 'Failed to export workspace backup.');
                    }
                  }}
                >
                  <Download size={14} /> Export Workspace JSON
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setBackupError('');
                    setBackupStatus('');
                    backupFileInputRef.current?.click();
                  }}
                >
                  <Upload size={14} /> Import Backup JSON
                </Button>
                <input
                  ref={backupFileInputRef}
                  type="file"
                  accept="application/json,.json"
                  style={{ display: 'none' }}
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    e.target.value = '';
                    if (!file) return;
                    setBackupError('');
                    setBackupStatus('');
                    try {
                      const text = await file.text();
                      const parsed = JSON.parse(text);
                      const check = validateWorkspaceBackup(parsed);
                      if (!check.valid) {
                        setBackupError(check.error || 'Invalid backup file.');
                        return;
                      }
                      setPendingBackup({ fileName: file.name, payload: parsed });
                    } catch {
                      setBackupError('Could not read backup file. Please select a valid ELEVSKILL JSON backup.');
                    }
                  }}
                />
              </div>

              {pendingBackup && (
                <div
                  role="alertdialog"
                  style={{
                    marginTop: '12px',
                    padding: '12px',
                    borderRadius: '10px',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-app)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.88rem', fontWeight: 600 }}>
                    <AlertTriangle size={15} style={{ color: '#d97706', flexShrink: 0 }} />
                    <span>
                      Replace your current workspace records with backup &ldquo;{pendingBackup.fileName}&rdquo;?
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      disabled={isImporting}
                      onClick={async () => {
                        setIsImporting(true);
                        setBackupError('');
                        try {
                          await onImportBackup?.(pendingBackup.payload);
                          setPendingBackup(null);
                          setBackupStatus('Workspace restored from backup successfully.');
                        } catch (err) {
                          setBackupError(err?.message || 'Failed to import workspace backup.');
                        } finally {
                          setIsImporting(false);
                        }
                      }}
                    >
                      {isImporting ? 'Importing...' : 'Confirm Replace & Import'}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={isImporting}
                      onClick={() => setPendingBackup(null)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {backupStatus && (
                <div role="status" className="text-small" style={{ marginTop: '10px', color: '#15803d', fontWeight: 600 }}>
                  {backupStatus}
                </div>
              )}
              {backupError && (
                <div role="alert" className="validation-error" style={{ marginTop: '10px' }}>
                  {backupError}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
