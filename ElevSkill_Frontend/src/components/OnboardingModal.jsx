import { useState } from 'react';
import { ArrowRight, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { Button } from './Button';
import {
  CAREER_INTEREST_OPTIONS,
  DEGREE_OPTIONS,
  TARGET_ROLE_OPTIONS,
  resolveDropdownState,
  resolveDropdownValue,
} from '../data/profileOptions';

export function OnboardingModal({ userProfile, onComplete, onSkip, isAuthenticated = false }) {
  const initRole = resolveDropdownState(userProfile?.targetRole, TARGET_ROLE_OPTIONS);
  const initDegree = resolveDropdownState(userProfile?.degree, DEGREE_OPTIONS);
  const initInterest = resolveDropdownState(userProfile?.careerInterests, CAREER_INTEREST_OPTIONS);

  const [name, setName] = useState(userProfile?.name || '');
  const [status, setStatus] = useState(userProfile?.experienceLevel || '');
  const [targetRoleSelect, setTargetRoleSelect] = useState(initRole.selected);
  const [customTargetRole, setCustomTargetRole] = useState(initRole.custom);
  const [degreeSelect, setDegreeSelect] = useState(initDegree.selected);
  const [customDegree, setCustomDegree] = useState(initDegree.custom);
  const [institution, setInstitution] = useState(userProfile?.institution || '');
  const [graduationYear, setGraduationYear] = useState(userProfile?.graduationYear || '');
  const [interestSelect, setInterestSelect] = useState(initInterest.selected);
  const [customInterest, setCustomInterest] = useState(initInterest.custom);

  const handleSubmit = (e) => {
    e.preventDefault();
    const resolvedRole = resolveDropdownValue(targetRoleSelect, customTargetRole);
    const resolvedDegree = resolveDropdownValue(degreeSelect, customDegree);
    const resolvedInterests = resolveDropdownValue(interestSelect, customInterest);
    const eduSummary =
      [resolvedDegree, institution.trim(), graduationYear.trim() ? `Class of ${graduationYear.trim()}` : '']
        .filter(Boolean)
        .join(' · ') || userProfile?.education || '';

    onComplete({
      ...userProfile,
      name: name.trim(),
      experienceLevel: status,
      targetRole: resolvedRole,
      degree: resolvedDegree,
      institution: institution.trim(),
      graduationYear: graduationYear.trim(),
      education: eduSummary,
      careerInterests: resolvedInterests,
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
            <label className="form-label" htmlFor="ob-role">Target Role</label>
            <select
              id="ob-role"
              className="form-select"
              value={targetRoleSelect}
              onChange={(e) => setTargetRoleSelect(e.target.value)}
            >
              <option value="">Select target role (optional)</option>
              {TARGET_ROLE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
            {targetRoleSelect === 'Other' && (
              <input
                id="ob-role-custom"
                type="text"
                className="form-input"
                aria-label="Custom target role"
                placeholder="Enter your target role"
                value={customTargetRole}
                onChange={(e) => setCustomTargetRole(e.target.value)}
              />
            )}
          </div>

          <div className="grid-2">
            <div className="form-field">
              <label className="form-label" htmlFor="ob-degree">Degree / Course</label>
              <select
                id="ob-degree"
                className="form-select"
                value={degreeSelect}
                onChange={(e) => setDegreeSelect(e.target.value)}
              >
                <option value="">Select degree / course (optional)</option>
                {DEGREE_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {degreeSelect === 'Other' && (
                <input
                  id="ob-degree-custom"
                  type="text"
                  className="form-input"
                  aria-label="Custom degree or course"
                  placeholder="Enter your degree or course"
                  value={customDegree}
                  onChange={(e) => setCustomDegree(e.target.value)}
                />
              )}
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
              <label className="form-label" htmlFor="ob-interests">Career Interest</label>
              <select
                id="ob-interests"
                className="form-select"
                value={interestSelect}
                onChange={(e) => setInterestSelect(e.target.value)}
              >
                <option value="">Select career interest (optional)</option>
                {CAREER_INTEREST_OPTIONS.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
              {interestSelect === 'Other' && (
                <input
                  id="ob-interests-custom"
                  type="text"
                  className="form-input"
                  aria-label="Custom career interest"
                  placeholder="Enter your career interest"
                  value={customInterest}
                  onChange={(e) => setCustomInterest(e.target.value)}
                />
              )}
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
