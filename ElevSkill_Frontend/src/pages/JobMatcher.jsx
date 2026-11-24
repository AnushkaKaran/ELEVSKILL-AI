import { useState, useEffect } from 'react';
import { GitCompare, RotateCcw, RefreshCw } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { ProgressBar } from '../components/ProgressBar';
import { SAMPLE_RESUMES, SAMPLE_JOB_DESCRIPTIONS } from '../data/sampleData';
import { checkJobMatcherHealth, matchProfileToJob } from '../services/jobMatcherApi';
import './pages.css';

const DIMENSION_LABELS = {
  required_skill_coverage: 'Required Skill Coverage',
  semantic_relevance: 'Semantic Profile Relevance',
  project_experience_alignment: 'Project & Experience Alignment',
  preferred_skill_coverage: 'Preferred Skill Coverage',
  education_qualification_alignment: 'Education & Qualification Alignment',
};

function getAlignmentLabel(score) {
  if (score >= 70) return 'Strong Alignment';
  if (score >= 45) return 'Moderate Alignment';
  return 'Low Alignment';
}

export function JobMatcher({ initialResumeText = '', userProfile, roadmapSkills, onRecordMatch }) {
  const [resumeText, setResumeText] = useState(initialResumeText || '');
  const [jobText, setJobText] = useState('');
  const [samplePairIndex, setSamplePairIndex] = useState(0);
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState('');
  const [isMatching, setIsMatching] = useState(false);
  const [comparison, setComparison] = useState(null);

  useEffect(() => {
    if (initialResumeText) {
      setResumeText(initialResumeText);
      setComparison(null);
    }
  }, [initialResumeText]);
  const [health, setHealth] = useState({
    checking: true,
    ok: false,
    degraded: false,
    reachable: false,
  });

  const refreshHealth = async () => {
    setHealth((prev) => ({ ...prev, checking: true }));
    const status = await checkJobMatcherHealth();
    setHealth({ checking: false, ...status });
  };

  useEffect(() => {
    let active = true;
    checkJobMatcherHealth().then((status) => {
      if (active) {
        setHealth({ checking: false, ...status });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const runMatch = async () => {
    if (isMatching) return;
    if (!resumeText.trim() || !jobText.trim()) {
      setError('Please provide both your resume/profile text and a target job description to compare.');
      return;
    }

    setError('');
    setApiError('');
    setIsMatching(true);

    const completedRoadmapSkills = (roadmapSkills || [])
      .filter((s) => s.completed && s.title?.trim())
      .map((s) => s.title.trim());

    const profilePayload = {
      resume_text: resumeText,
      skills: completedRoadmapSkills.length > 0 ? completedRoadmapSkills : null,
      education: userProfile?.education?.trim() || null,
      target_role: userProfile?.targetRole?.trim() || null,
      experience_level: userProfile?.experienceLevel?.trim() || null,
      project_descriptions: null,
    };
    const jobPayload = {
      description: jobText,
    };

    try {
      const data = await matchProfileToJob(profilePayload, jobPayload);
      setComparison(data);
      setHealth({
        checking: false,
        reachable: true,
        ok: true,
        degraded: false,
        modelLoaded: true,
      });
      onRecordMatch?.({
        matchPercent: data.overall_match_score,
        readiness: getAlignmentLabel(data.overall_match_score),
        comparedAt: new Date().toISOString(),
      });
    } catch (err) {
      setComparison(null);
      if (err?.status === 422 || err?.code === 'VALIDATION_ERROR') {
        setError(err.message);
        setHealth({
          checking: false,
          reachable: true,
          ok: true,
          degraded: false,
          modelLoaded: true,
        });
      } else {
        setApiError(
          err instanceof Error
            ? err.message
            : 'Job Matcher service is currently unavailable.'
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
      setIsMatching(false);
    }
  };

  const handleCompare = (e) => {
    e.preventDefault();
    runMatch();
  };

  const handleLoadSample = () => {
    const idx = samplePairIndex % SAMPLE_RESUMES.length;
    const nextResume = SAMPLE_RESUMES[idx] || SAMPLE_RESUMES[0];
    const nextJob = SAMPLE_JOB_DESCRIPTIONS[idx] || SAMPLE_JOB_DESCRIPTIONS[0];

    setError('');
    setApiError('');
    setResumeText(nextResume.resumeText);
    setJobText(nextJob.description);
    setComparison(null);
    setSamplePairIndex((prev) => (prev + 1) % SAMPLE_RESUMES.length);
  };

  const handleClear = () => {
    setResumeText('');
    setJobText('');
    setError('');
    setApiError('');
    setComparison(null);
  };

  const applicableDimensions = comparison?.dimension_scores
    ? Object.entries(comparison.dimension_scores)
        .filter(([, info]) => info.applicable && info.score_percent !== null)
        .map(([key, info]) => ({
          key,
          label: DIMENSION_LABELS[key] || key,
          score: info.score_percent,
          weightPct: Math.round((info.effective_weight || 0) * 100),
        }))
    : [];

  const excludedDimensions = comparison?.diagnostics?.excluded_dimensions || [];

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <form onSubmit={handleCompare} noValidate>
        <div className="grid-2">
          <Card title="Your Resume & Profile" subtitle="Paste or edit your resume text (profile settings are included automatically when saved)">
            <div className="form-field">
              <label className="form-label" htmlFor="matcher-resume">
                Resume / Profile Content
              </label>
              <textarea
                id="matcher-resume"
                className="form-textarea"
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                  if (error) setError('');
                  if (apiError) setApiError('');
                }}
                placeholder="Paste your resume or project experience text..."
              />
            </div>
          </Card>

          <Card title="Target Job Description" subtitle="Paste the role requirements and preferred skills">
            <div className="form-field">
              <label className="form-label" htmlFor="matcher-job">
                Job Description
              </label>
              <textarea
                id="matcher-job"
                className="form-textarea"
                value={jobText}
                onChange={(e) => {
                  setJobText(e.target.value);
                  if (error) setError('');
                  if (apiError) setApiError('');
                }}
                placeholder="Paste the job description (at least 6 words)..."
              />
            </div>
          </Card>
        </div>

        {error && (
          <div className="validation-error" role="alert" style={{ marginTop: '14px' }}>
            {error}
          </div>
        )}

        {apiError && (
          <div
            className="validation-error"
            role="alert"
            style={{
              marginTop: '14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '10px',
              flexWrap: 'wrap',
            }}
          >
            <span>{apiError}</span>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={runMatch}
              disabled={isMatching}
            >
              Retry
            </Button>
          </div>
        )}

        <div className="action-row">
          <Button type="submit" variant="primary" disabled={isMatching}>
            <GitCompare size={16} /> {isMatching ? 'Matching...' : 'Compare Resume & Job'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={handleLoadSample}
            disabled={isMatching}
            title="Load next sample resume and job description pair"
          >
            <RotateCcw size={15} /> Load Sample Pair
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleClear}
            disabled={isMatching}
          >
            Clear
          </Button>
        </div>
      </form>

      {isMatching ? (
        <Card title="Profile-to-Job Alignment" subtitle="Evaluating alignment...">
          <div className="empty-state">
            Comparing your profile with the job description...
          </div>
        </Card>
      ) : comparison ? (
        <Card
          title="Profile-to-Job Alignment Breakdown"
          subtitle={comparison.match_explanation}
          action={
            <Badge variant={comparison.overall_match_score >= 70 ? 'success' : 'warning'}>
              {comparison.overall_match_score}% Alignment
            </Badge>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="score-highlight">
              <div className="score-circle">{comparison.overall_match_score}</div>
              <div>
                <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>
                  Profile-to-Job Alignment Score ({getAlignmentLabel(comparison.overall_match_score)})
                </h4>
                <p className="text-small text-muted">
                  Semantic Relevance:{' '}
                  <strong>
                    {Math.round(
                      comparison.dimension_scores?.semantic_relevance?.score_percent ??
                        (comparison.semantic_relevance || 0) * 100
                    )}
                    %
                  </strong>
                  {comparison.required_skill_coverage !== null && (
                    <> · Required Skills: <strong>{comparison.required_skill_coverage}%</strong></>
                  )}
                  {comparison.preferred_skill_coverage !== null && (
                    <> · Preferred Skills: <strong>{comparison.preferred_skill_coverage}%</strong></>
                  )}
                </p>
              </div>
            </div>

            {applicableDimensions.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <h4 style={{ fontSize: '0.92rem' }}>Applicable Dimension Scores</h4>
                {applicableDimensions.map((dim, idx) => (
                  <ProgressBar
                    key={dim.key}
                    label={`${dim.label} (weight ${dim.weightPct}%)`}
                    value={dim.score}
                    tone={idx % 3 === 0 ? 'purple' : idx % 3 === 1 ? 'blue' : 'green'}
                  />
                ))}
              </div>
            )}

            <div className="grid-2">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <h4 style={{ fontSize: '0.92rem' }}>
                    Matched Required Skills ({(comparison.matched_required_skills ?? comparison.matched_skills ?? []).length})
                  </h4>
                  {(comparison.matched_required_skills ?? comparison.matched_skills ?? []).length > 0 ? (
                    <div className="chip-group">
                      {(comparison.matched_required_skills ?? comparison.matched_skills ?? []).map((kw) => (
                        <span key={kw} className="chip chip-match">
                          {kw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-small text-muted" style={{ marginTop: '8px' }}>
                      No overlapping required skills detected between your profile and this job description.
                    </p>
                  )}
                </div>

                {comparison.matched_preferred_skills?.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.92rem' }}>
                      Matched Preferred Skills ({comparison.matched_preferred_skills.length})
                    </h4>
                    <div className="chip-group">
                      {comparison.matched_preferred_skills.map((kw) => (
                        <span key={kw} className="chip chip-match">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div>
                  <h4 style={{ fontSize: '0.92rem' }}>
                    Missing Required Skills ({comparison.missing_required_skills?.length || 0})
                  </h4>
                  {comparison.missing_required_skills?.length > 0 ? (
                    <div className="chip-group">
                      {comparison.missing_required_skills.map((kw) => (
                        <span key={kw} className="chip chip-miss">
                          {kw}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-small text-muted" style={{ marginTop: '6px' }}>
                      No missing required skills detected.
                    </p>
                  )}
                </div>

                {comparison.missing_preferred_skills?.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '0.92rem' }}>
                      Missing Preferred / Optional Skills ({comparison.missing_preferred_skills.length})
                    </h4>
                    <div className="chip-group">
                      {comparison.missing_preferred_skills.map((kw) => (
                        <span key={kw} className="chip chip-miss">
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {comparison.relevant_profile_evidence?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.92rem' }}>Relevant Profile Evidence</h4>
                <ul className="feedback-list">
                  {comparison.relevant_profile_evidence.map((ev, idx) => (
                    <li key={idx}>
                      <span className="feedback-dot" />
                      <span>
                        [{ev.source}, {Math.round(ev.similarity * 100)}% match] {ev.text}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {comparison.strengths?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.92rem' }}>Strengths</h4>
                <ul className="feedback-list">
                  {comparison.strengths.map((s, idx) => (
                    <li key={idx}>
                      <span className="feedback-dot" />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {comparison.improvement_suggestions?.length > 0 && (
              <div>
                <h4 style={{ fontSize: '0.92rem' }}>Improvement Suggestions</h4>
                <ul className="feedback-list">
                  {comparison.improvement_suggestions.map((s, idx) => (
                    <li key={idx}>
                      <span className="feedback-dot" style={{ backgroundColor: 'var(--warning)' }} />
                      <span>{s}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="question-tip">
              <strong>Note:</strong> {comparison.limitations}
              {excludedDimensions.length > 0 && (
                <> Excluded dimensions (insufficient input): {excludedDimensions.map((d) => DIMENSION_LABELS[d] || d).join(', ')}.</>
              )}
            </div>
          </div>
        </Card>
      ) : (
        <Card title="Profile-to-Job Alignment Breakdown" subtitle="Structured ML results area">
          <div className="empty-state">
            No comparison run yet. Enter both your resume/profile text and a job description above, then click{' '}
            <strong>Compare Resume & Job</strong>.
          </div>
        </Card>
      )}
    </div>
  );
}
