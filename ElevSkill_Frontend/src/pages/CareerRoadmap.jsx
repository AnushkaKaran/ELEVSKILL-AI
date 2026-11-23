import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Plus, RotateCcw, RefreshCw, ExternalLink, Check, Lock, Trash2, AlertTriangle, X } from 'lucide-react';
import { Card } from '../components/Card';
import { ProgressBar } from '../components/ProgressBar';
import { Badge } from '../components/Badge';
import { Button } from '../components/Button';
import { calculateRoadmapProgress, normalizeSkillStatus } from '../utils/dashboardStore';
import { SKILL_CATALOG, SKILL_CATALOG_CATEGORIES } from '../data/skillCatalog';
import {
  checkCareerRoadmapHealth,
  generateCareerRoadmap,
} from '../services/careerRoadmapApi';
import './pages.css';

export function CareerRoadmap({
  skills,
  userProfile,
  onToggleSkill,
  onSetSkillStatus,
  onToggleKnownSkill,
  onAddSkill,
  onAddSkillsBatch,
  onDeleteSkill,
  onResetSkills,
  onNavigate,
}) {
  const [newSkillTitle, setNewSkillTitle] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('Programming');
  const [newSkillKnown, setNewSkillKnown] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [formError, setFormError] = useState('');
  const [confirmDeleteSkillId, setConfirmDeleteSkillId] = useState(null);
  const confirmPopoverRef = useRef(null);

  const [roadmap, setRoadmap] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [apiError, setApiError] = useState('');
  const [health, setHealth] = useState({
    checking: true,
    ok: false,
    degraded: false,
    reachable: false,
  });

  const closeDeleteDialog = useCallback(() => {
    setConfirmDeleteSkillId(null);
  }, []);

  useEffect(() => {
    if (!confirmDeleteSkillId) return undefined;

    const popoverEl = confirmPopoverRef.current;
    if (popoverEl) {
      const rect = popoverEl.getBoundingClientRect();
      if (rect.top < 84 || rect.bottom > window.innerHeight - 16) {
        popoverEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeDeleteDialog();
      }
    };

    const handlePointerDown = (e) => {
      if (confirmPopoverRef.current && !confirmPopoverRef.current.contains(e.target)) {
        closeDeleteDialog();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [confirmDeleteSkillId, closeDeleteDialog]);

  const requestIdRef = useRef(0);
  const abortRef = useRef(null);

  const {
    completedCount,
    inProgressCount,
    totalCount,
    overallPercent: percent,
    remainingHours,
  } = calculateRoadmapProgress(skills);

  const targetRole = userProfile?.targetRole?.trim() || '';
  const experienceLevel = userProfile?.experienceLevel?.trim() || null;
  const education = userProfile?.education?.trim() || null;

  const completedTitles = skills
    .filter((s) => normalizeSkillStatus(s) === 'completed' && s.title?.trim())
    .map((s) => s.title.trim());
  const knownTitles = skills
    .filter((s) => s.alreadyKnown && s.title?.trim())
    .map((s) => s.title.trim());
  const syncKey = `${completedTitles.join('|')}::${knownTitles.join('|')}`;

  const existingNormalizedTitles = useMemo(
    () => new Set(skills.map((s) => s.title.trim().toLowerCase())),
    [skills]
  );

  const catalogSuggestions = useMemo(() => {
    const query = newSkillTitle.trim().toLowerCase();
    if (!query) return [];
    return SKILL_CATALOG.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
    ).slice(0, 8);
  }, [newSkillTitle]);

  const refreshHealth = async () => {
    setHealth((prev) => ({ ...prev, checking: true }));
    const status = await checkCareerRoadmapHealth();
    setHealth({ checking: false, ...status });
  };

  const fetchRoadmap = useCallback(async () => {
    if (!targetRole) {
      setRoadmap(null);
      setValidationError('');
      setApiError('');
      setIsLoading(false);
      return;
    }

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const reqId = ++requestIdRef.current;

    setIsLoading(true);
    setValidationError('');
    setApiError('');

    const payload = {
      target_role: targetRole,
      experience_level: experienceLevel,
      education,
      known_skills: knownTitles.length > 0 ? knownTitles : null,
      completed_skills: completedTitles.length > 0 ? completedTitles : null,
      project_descriptions: null,
      resume_text: null,
    };

    try {
      const data = await generateCareerRoadmap(payload, { signal: controller.signal });
      if (reqId !== requestIdRef.current) return;

      setRoadmap(data);
      setHealth({
        checking: false,
        reachable: true,
        ok: true,
        degraded: false,
        modelLoaded: true,
        engineReady: true,
      });
    } catch (err) {
      if (err?.code === 'ABORTED' || reqId !== requestIdRef.current) return;

      if (err?.status === 422 || err?.code === 'VALIDATION_ERROR') {
        setValidationError(err.message);
        setHealth({
          checking: false,
          reachable: true,
          ok: true,
          degraded: false,
          modelLoaded: true,
          engineReady: true,
        });
      } else {
        setRoadmap(null);
        setApiError(
          err instanceof Error
            ? err.message
            : 'Career Roadmap service is currently unavailable.'
        );
        setHealth((prev) => ({
          ...prev,
          checking: false,
          ok: false,
          reachable: err?.code !== 'NETWORK_ERROR',
          degraded: err?.status === 503,
        }));
      }
    } finally {
      if (reqId === requestIdRef.current) {
        setIsLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRole, experienceLevel, education, syncKey]);

  useEffect(() => {
    let active = true;
    checkCareerRoadmapHealth().then((status) => {
      if (active) {
        setHealth({ checking: false, ...status });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    fetchRoadmap();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchRoadmap]);

  const isSkillInChecklist = (skillName) =>
    existingNormalizedTitles.has(skillName.trim().toLowerCase());

  const handleAdd = (e) => {
    e.preventDefault();
    const trimmed = newSkillTitle.trim();
    if (!trimmed) {
      setFormError('Please enter a skill name before adding.');
      return;
    }
    if (isSkillInChecklist(trimmed)) {
      setFormError(`"${trimmed}" is already in your roadmap.`);
      return;
    }
    const catalogMatch = SKILL_CATALOG.find(
      (item) => item.title.toLowerCase() === trimmed.toLowerCase()
    );
    setFormError('');
    onAddSkill({
      title: catalogMatch ? catalogMatch.title : trimmed,
      category: catalogMatch ? catalogMatch.category : newSkillCategory,
      hours: catalogMatch ? catalogMatch.hours : 4,
      priority: catalogMatch ? catalogMatch.priority : 'Medium',
      alreadyKnown: newSkillKnown,
    });
    setNewSkillTitle('');
    setNewSkillKnown(false);
    setShowSuggestions(false);
  };

  const handlePickSuggestion = (item) => {
    if (isSkillInChecklist(item.title)) {
      setFormError(`"${item.title}" is already in your roadmap.`);
      setShowSuggestions(false);
      return;
    }
    setFormError('');
    onAddSkill({
      title: item.title,
      category: item.category,
      hours: item.hours,
      priority: item.priority,
      alreadyKnown: newSkillKnown,
    });
    setNewSkillTitle('');
    setNewSkillKnown(false);
    setShowSuggestions(false);
  };

  const handleAddRecommended = (item) => {
    if (isSkillInChecklist(item.skill)) return;
    onAddSkill({
      title: item.skill,
      category: item.category || 'Programming',
      hours: item.estimated_hours || 4,
      priority: item.tier === 'foundational' ? 'High' : 'Medium',
      alreadyKnown: false,
    });
  };

  const handleSyncAllRecommended = () => {
    if (!roadmap?.recommended_next_skills?.length || !onAddSkillsBatch) return;
    onAddSkillsBatch(
      roadmap.recommended_next_skills.map((item) => ({
        title: item.skill,
        category: item.category || 'Programming',
        hours: item.estimated_hours || 4,
        priority: item.tier === 'foundational' ? 'High' : 'Medium',
      }))
    );
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card
        title="Roadmap Progress Tracking"
        subtitle={
          totalCount > 0
            ? `${completedCount} of ${totalCount} skills completed (${inProgressCount} in progress) · ~${remainingHours} hrs remaining`
            : 'No roadmap skills added yet — search the catalog or sync recommendations below'
        }
        action={
          <Button
            variant="ghost"
            size="sm"
            onClick={onResetSkills}
            disabled={totalCount === 0}
          >
            <RotateCcw size={14} /> Clear Roadmap
          </Button>
        }
      >
        <ProgressBar label="Overall Career Roadmap Completion" value={percent} tone="purple" />
      </Card>

      <div className="grid-2">
        <Card
          title="Skills Checklist"
          subtitle="Track Not Started, In Progress, Completed, or mark skills you already know"
        >
          <form onSubmit={handleAdd} noValidate style={{ marginBottom: '16px', position: 'relative' }}>
            <div style={{ position: 'relative' }}>
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ flex: '1 1 200px' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ width: '100%' }}
                    placeholder="Search or add skill (e.g., py, React, SQL)..."
                    value={newSkillTitle}
                    onFocus={() => setShowSuggestions(true)}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') setShowSuggestions(false);
                    }}
                    onChange={(e) => {
                      setNewSkillTitle(e.target.value);
                      setShowSuggestions(true);
                      if (formError) setFormError('');
                    }}
                  />
                </div>
                <select
                  className="form-select"
                  style={{ width: 'auto' }}
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value)}
                  aria-label="Skill category"
                >
                  {SKILL_CATALOG_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <Button type="submit" variant="primary">
                  <Plus size={16} /> Add
                </Button>
              </div>
              {showSuggestions && catalogSuggestions.length > 0 && (
                <div
                  role="listbox"
                  aria-label="Skill suggestions"
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 20,
                    marginTop: '4px',
                    background: 'var(--bg-surface, #ffffff)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
                    maxHeight: '220px',
                    overflowY: 'auto',
                  }}
                >
                  {catalogSuggestions.map((item) => {
                    const alreadyAdded = isSkillInChecklist(item.title);
                    return (
                      <button
                        key={item.title}
                        type="button"
                        role="option"
                        aria-selected={false}
                        disabled={alreadyAdded}
                        onClick={() => handlePickSuggestion(item)}
                        style={{
                          width: '100%',
                          textAlign: 'left',
                          padding: '8px 12px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '8px',
                          borderBottom: '1px solid var(--border-subtle)',
                          opacity: alreadyAdded ? 0.5 : 1,
                          cursor: alreadyAdded ? 'default' : 'pointer',
                          background: 'transparent',
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{item.title}</span>
                        <span className="text-small text-muted">
                          {alreadyAdded ? 'Added' : `${item.category} · ${item.hours}h`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: '8px',
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <input
                type="checkbox"
                checked={newSkillKnown}
                onChange={(e) => setNewSkillKnown(e.target.checked)}
              />
              Mark as already known (for personalized recommendations)
            </label>
            {formError && (
              <div className="validation-error" role="alert" style={{ marginTop: '10px' }}>
                {formError}
              </div>
            )}
          </form>

          {skills.length === 0 ? (
            <div className="empty-state">
              Your roadmap checklist is empty. Search the skill catalog above (e.g., type{' '}
              <strong>py</strong> for Python/PyTorch) or click <strong>Sync Recommended</strong> on
              the right after setting your Target Role.
            </div>
          ) : (
            <div className="checklist">
              {skills.map((skill) => {
                const status = normalizeSkillStatus(skill);
                const isConfirming = confirmDeleteSkillId === skill.id;
                return (
                  <div
                    key={skill.id}
                    className="checklist-item"
                    style={{
                      flexWrap: 'wrap',
                      gap: '8px',
                      position: 'relative',
                      zIndex: isConfirming ? 30 : 'auto',
                    }}
                  >
                    {isConfirming && (
                      <div
                        ref={confirmPopoverRef}
                        role="alertdialog"
                        aria-modal="false"
                        aria-labelledby={`roadmap-delete-title-${skill.id}`}
                        onMouseDown={(e) => e.stopPropagation()}
                        style={{
                          position: 'absolute',
                          bottom: 'calc(100% + 8px)',
                          right: 0,
                          zIndex: 35,
                          width: 'min(380px, 100%)',
                          background: 'var(--bg-surface)',
                          borderRadius: 'var(--radius-lg)',
                          border: '1px solid var(--border-subtle)',
                          boxShadow: 'var(--shadow-elevated)',
                          padding: '18px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '12px',
                          cursor: 'default',
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span
                              style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '10px',
                                background: 'rgba(220, 38, 38, 0.1)',
                                color: '#dc2626',
                                display: 'inline-flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                flexShrink: 0,
                              }}
                            >
                              <AlertTriangle size={16} />
                            </span>
                            <h3
                              id={`roadmap-delete-title-${skill.id}`}
                              style={{ margin: 0, fontSize: '0.98rem', color: 'var(--text-primary)' }}
                            >
                              Remove Skill
                            </h3>
                          </div>
                          <button
                            type="button"
                            onClick={closeDeleteDialog}
                            aria-label="Cancel removal"
                            style={{
                              padding: '6px',
                              borderRadius: '8px',
                              color: 'var(--text-muted)',
                              background: 'transparent',
                            }}
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                          Are you sure you want to remove <strong>{skill.title}</strong> from your Skills Checklist?
                        </p>

                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '2px' }}>
                          <Button type="button" variant="ghost" onClick={closeDeleteDialog}>
                            Cancel
                          </Button>
                          <button
                            type="button"
                            className="btn btn-primary"
                            style={{ background: '#dc2626', borderColor: '#dc2626', color: '#ffffff' }}
                            onClick={() => {
                              closeDeleteDialog();
                              onDeleteSkill?.(skill.id);
                            }}
                          >
                            <Trash2 size={14} /> Remove Skill
                          </button>
                        </div>
                      </div>
                    )}
                    <span className="checklist-left">
                      <input
                        type="checkbox"
                        className="checklist-checkbox"
                        checked={status === 'completed'}
                        onChange={() => onToggleSkill(skill.id)}
                        aria-label={`Mark ${skill.title} completed`}
                      />
                      <span className={`checklist-title ${status === 'completed' ? 'done' : ''}`}>
                        {skill.title}
                      </span>
                    </span>
                    <span className="checklist-meta" style={{ flexWrap: 'wrap' }}>
                      <Badge variant="neutral">{skill.category}</Badge>
                      <Badge variant={skill.priority === 'High' ? 'purple' : 'blue'}>
                        {skill.hours}h
                      </Badge>
                      <button
                        type="button"
                        onClick={() => onToggleKnownSkill?.(skill.id)}
                        title="Toggle between Already Known and To Learn"
                        style={{
                          padding: '2px 8px',
                          borderRadius: '999px',
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          border: '1px solid var(--border-subtle)',
                          background: skill.alreadyKnown ? 'var(--accent-green-soft, #dcfce7)' : 'transparent',
                          color: 'var(--text-primary)',
                          cursor: 'pointer',
                        }}
                      >
                        {skill.alreadyKnown ? 'Known' : 'To Learn'}
                      </button>
                      <select
                        aria-label={`Status for ${skill.title}`}
                        className="form-select"
                        style={{ width: 'auto', padding: '3px 8px', fontSize: '0.78rem' }}
                        value={status}
                        onChange={(e) => onSetSkillStatus?.(skill.id, e.target.value)}
                      >
                        <option value="not_started">Not Started</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                      <button
                        type="button"
                        onMouseDown={(e) => e.stopPropagation()}
                        onClick={() => setConfirmDeleteSkillId((prev) => (prev === skill.id ? null : skill.id))}
                        aria-label={`Remove ${skill.title}`}
                        title="Remove skill"
                        style={{
                          padding: '4px 6px',
                          borderRadius: '6px',
                          border: '1px solid transparent',
                          background: 'transparent',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        <Card
          title="AI-Powered Roadmap Recommendations"
          subtitle={
            targetRole
              ? `Personalized for target role: ${targetRole}`
              : 'Set a target role in Settings to generate personalized recommendations'
          }
          action={
            targetRole ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchRoadmap}
                disabled={isLoading}
              >
                <RefreshCw size={13} /> {isLoading ? 'Refreshing...' : 'Refresh'}
              </Button>
            ) : (
              onNavigate && (
                <Button variant="primary" size="sm" onClick={() => onNavigate('settings')}>
                  Set Target Role
                </Button>
              )
            )
          }
        >
          {!targetRole ? (
            <div className="empty-state">
              No target role set yet. Open <strong>Settings</strong> and save a target job role
              (e.g., <em>Data Scientist</em>, <em>Frontend Developer</em>, <em>Backend Developer</em>)
              to generate a prerequisite-ordered roadmap.
            </div>
          ) : validationError ? (
            <div className="validation-error" role="alert">
              {validationError}
            </div>
          ) : apiError ? (
            <div
              className="validation-error"
              role="alert"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              <span>{apiError}</span>
              <Button variant="secondary" size="sm" onClick={fetchRoadmap} disabled={isLoading}>
                Retry
              </Button>
            </div>
          ) : isLoading && !roadmap ? (
            <div className="empty-state">
              Generating personalized roadmap for <strong>{targetRole}</strong>...
            </div>
          ) : !roadmap ? (
            <div className="empty-state">
              Click <strong>Refresh</strong> to generate personalized recommendations.
            </div>
          ) : !roadmap.valid ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="validation-error" role="alert">
                {roadmap.error}
              </div>
              {roadmap.role_resolution?.candidates?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.9rem', marginBottom: '6px' }}>
                    Supported Career Tracks
                  </h4>
                  <p className="text-small text-muted">
                    Try updating your Target Role in Settings to one of: Frontend Developer, Backend
                    Developer, Python Developer, Data Analyst, Data Scientist, or Machine Learning Engineer.
                  </p>
                </div>
              )}
              {onNavigate && (
                <div>
                  <Button variant="secondary" size="sm" onClick={() => onNavigate('settings')}>
                    Update Target Role in Settings
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* A. Career Target */}
              <div className="rec-card">
                <div className="rec-top">
                  <Badge variant="purple">Canonical Role: {roadmap.target_role}</Badge>
                  <span className="text-small text-muted">
                    Match: {Math.round((roadmap.role_resolution?.confidence || 0) * 100)}%
                  </span>
                </div>
                <p className="rec-desc">{roadmap.personalization_explanation}</p>
                {roadmap.estimated_effort?.approximate_hours_remaining !== undefined && (
                  <span className="text-small text-muted">
                    Approximate remaining effort: ~{roadmap.estimated_effort.approximate_hours_remaining} hrs
                    (baseline estimate only)
                  </span>
                )}
              </div>

              {/* B. Current Skill Assessment */}
              <div>
                <h4 style={{ fontSize: '0.92rem', marginBottom: '8px' }}>
                  Current Skill Assessment ({roadmap.current_skill_assessment?.coverage_percent ?? 0}% role coverage)
                </h4>
                <div className="chip-group">
                  {roadmap.completed_skills?.map((s) => (
                    <span key={`comp-${s}`} className="chip chip-match">
                      Completed: {s}
                    </span>
                  ))}
                  {roadmap.known_skills?.map((s) => (
                    <span key={`known-${s}`} className="chip chip-match">
                      Known: {s}
                    </span>
                  ))}
                  {roadmap.missing_skills?.map((s) => (
                    <span key={`miss-${s}`} className="chip chip-miss">
                      Missing: {s}
                    </span>
                  ))}
                </div>
                {roadmap.uncertain_skills?.length > 0 && (
                  <p className="text-small text-muted" style={{ marginTop: '8px' }}>
                    Unmapped custom items: {roadmap.uncertain_skills.join(', ')}
                  </p>
                )}
                {roadmap.current_skill_assessment?.unprovided_profile_fields?.length > 0 && (
                  <p className="text-small text-muted" style={{ marginTop: '6px' }}>
                    Unprovided profile context:{' '}
                    {roadmap.current_skill_assessment.unprovided_profile_fields.join(', ')} (not
                    counted as missing skills).
                  </p>
                )}
              </div>

              {/* D. Recommended Next Skills */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '10px', flexWrap: 'wrap' }}>
                  <h4 style={{ fontSize: '0.92rem' }}>
                    Recommended Next Skills (Actionable Now)
                  </h4>
                  {roadmap.recommended_next_skills?.some((item) => !isSkillInChecklist(item.skill)) && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleSyncAllRecommended}
                    >
                      <Plus size={13} /> Sync Recommended
                    </Button>
                  )}
                </div>
                {roadmap.recommended_next_skills?.length === 0 ? (
                  <div className="empty-state">
                    All skills for <strong>{roadmap.target_role}</strong> are already covered!
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {roadmap.recommended_next_skills.map((item) => {
                      const alreadyAdded = isSkillInChecklist(item.skill);
                      const objective = roadmap.learning_objectives?.[item.skill];
                      return (
                        <div key={item.skill_id} className="rec-card">
                          <div className="rec-top">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <Badge variant="blue">{item.tier}</Badge>
                              <Badge variant="neutral">{item.category}</Badge>
                              {item.estimated_hours && (
                                <span className="text-small text-muted">~{item.estimated_hours}h</span>
                              )}
                            </div>
                            <Button
                              type="button"
                              variant={alreadyAdded ? 'ghost' : 'secondary'}
                              size="sm"
                              disabled={alreadyAdded}
                              onClick={() => handleAddRecommended(item)}
                            >
                              {alreadyAdded ? (
                                <>
                                  <Check size={14} /> In Checklist
                                </>
                              ) : (
                                <>
                                  <Plus size={14} /> Add to My Roadmap
                                </>
                              )}
                            </Button>
                          </div>
                          <h4 className="rec-title">{item.skill}</h4>
                          {objective && <p className="rec-desc">{objective}</p>}
                          <span className="text-small text-muted">{item.explanation}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* E. Blocked Skills */}
              {roadmap.blocked_skills?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.92rem', marginBottom: '8px' }}>
                    Upcoming Skills (Blocked by Prerequisites)
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {roadmap.blocked_skills.slice(0, 4).map((item) => (
                      <div key={item.skill_id} className="activity-item">
                        <div>
                          <div className="activity-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Lock size={13} /> {item.skill} ({item.tier})
                          </div>
                          <div className="activity-meta">{item.explanation}</div>
                        </div>
                        <Badge variant="neutral">{item.category}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* C. Staged Learning Roadmap Summary */}
              {roadmap.roadmap_stages && (
                <div>
                  <h4 style={{ fontSize: '0.92rem', marginBottom: '8px' }}>
                    Staged Learning Sequence
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {['foundational', 'intermediate', 'advanced'].map((tier) => {
                      const items = roadmap.roadmap_stages[tier] || [];
                      if (items.length === 0) return null;
                      return (
                        <div key={tier} className="text-small text-muted">
                          <strong style={{ textTransform: 'capitalize', color: 'var(--text-primary)' }}>
                            {tier}:
                          </strong>{' '}
                          {items.map((x) => x.skill).join(' → ')}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* F. Verified Official Learning Resources */}
              {roadmap.resource_recommendations?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.92rem', marginBottom: '8px' }}>
                    Verified Official Documentation
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {roadmap.resource_recommendations.slice(0, 5).map((res) => (
                      <a
                        key={res.skill_id}
                        href={res.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="activity-item"
                      >
                        <div>
                          <div className="activity-title">{res.title}</div>
                          <div className="activity-meta">
                            For {res.skill} · {res.source_type?.replace(/_/g, ' ')}
                          </div>
                        </div>
                        <ExternalLink size={15} style={{ color: 'var(--accent-purple-deep)', flexShrink: 0 }} />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="question-tip">
                <strong>Note:</strong> {roadmap.limitations}
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
