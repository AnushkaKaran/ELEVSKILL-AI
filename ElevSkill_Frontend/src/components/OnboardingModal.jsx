import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { Button } from './Button';

export function OnboardingModal({ userProfile, onComplete, onSkip, isAuthenticated = false }) {
  const [name, setName] = useState(userProfile?.name || '');
  const [status, setStatus] = useState(userProfile?.experienceLevel || '');
  const [targetRole, setTargetRole] = useState(userProfile?.targetRole || '');
  const [degree, setDegree] = useState(userProfile?.degree || '');
  const [institution, setInstitution] = useState(userProfile?.institution || '');
  const [graduationYear, setGraduationYear] = useState(userProfile?.graduationYear || '');
  const [careerInterests, setCareerInterests] = useState(userProfile?.careerInterests || '');

  const handleSubmit = (e) => {
    e.preventDefault();
    const eduSummary =
      [degree.trim(), institution.trim(), graduationYear.trim() ? `Class of ${graduationYear.trim()}` : '']
        .filter(Boolean)
        .join(' · ') || userProfile?.education || '';

    onComplete({
      ...userProfile,
      name: name.trim(),
      experienceLevel: status,
      targetRole: targetRole.trim(),
      degree: degree.trim(),
      institution: institution.trim(),
      graduationYear: graduationYear.trim(),
      education: eduSummary,
      careerInterests: careerInterests.trim(),
      onboardingDismissed: true,
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 60,
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
          maxWidth: '560px',
          maxHeight: '90vh',
          overflowY: 'auto',
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--border-subtle)',
          boxShadow: 'var(--shadow-elevated)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <BrandLogo variant="full-tagline" size="md" />
          <button
            type="button"
            onClick={onSkip}
            aria-label="Skip onboarding"
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
          <h2 id="onboarding-title" style={{ fontSize: '1.18rem', marginBottom: '4px' }}>
            Quick Profile Setup (Optional)
          </h2>
          <p className="text-small text-muted">
            Personalize your Career Roadmap and Dashboard. Everything here is optional — you can skip and explore immediately, or update details later in Settings.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="ob-name">Full Name</label>
              <input
                id="ob-name"
                type="text"
                className="form-input"
                placeholder="e.g., Alex Rivera"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="ob-status">Current Status</label>
              <select
                id="ob-status"
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="">Select status (optional)</option>
                <option value="Student">Student</option>
                <option value="Fresher">Fresher</option>
                <option value="Experienced">Experienced</option>
              </select>
            </div>
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="ob-role">Target Career Role</label>
            <input
              id="ob-role"
              type="text"
              className="form-input"
              placeholder="e.g., Frontend Developer, Data Analyst, Backend Developer"
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
            />
          </div>

          <div className="grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="ob-degree">Degree / Course</label>
              <input
                id="ob-degree"
                type="text"
                className="form-input"
                placeholder="e.g., B.S. Computer Science"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="ob-year">Graduation Year</label>
              <input
                id="ob-year"
                type="text"
                className="form-input"
                placeholder="e.g., 2026"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="ob-inst">Institution</label>
              <input
                id="ob-inst"
                type="text"
                className="form-input"
                placeholder="e.g., State University"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
              />
            </div>
            <div className="form-field">
              <label className="form-label" htmlFor="ob-interests">Career Interests</label>
              <input
                id="ob-interests"
                type="text"
                className="form-input"
                placeholder="e.g., Web Apps, AI/ML, Cloud"
                value={careerInterests}
                onChange={(e) => setCareerInterests(e.target.value)}
              />
            </div>
          </div>

          <div className="action-row" style={{ justifyContent: 'flex-end', marginTop: '4px' }}>
            <Button type="button" variant="ghost" onClick={onSkip}>
              Skip for now
            </Button>
            <Button type="submit" variant="primary">
              Save & Explore <ArrowRight size={15} />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
