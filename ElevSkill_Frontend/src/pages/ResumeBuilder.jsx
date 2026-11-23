import { useState, useEffect } from 'react';
import { Printer, RotateCcw, Save, Sparkles } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { backendWorkspaceApi } from '../services/backendWorkspaceApi';
import { STORAGE_KEYS, safeReadStorage, safeWriteStorage } from '../utils/dashboardStore';
import './pages.css';

const GUEST_DRAFT_KEY = STORAGE_KEYS.BUILDER_DRAFT;

const TEMPLATES = [
  { id: 'classic', label: 'Classic Clean', accent: '#1E293B' },
  { id: 'modern', label: 'Modern Indigo', accent: '#6E4E9E' },
  { id: 'compact', label: 'Compact Technical', accent: '#386A8C' },
];

function parseTextToSections(rawText, userProfile) {
  const text = (rawText || '').trim();
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/);
  const phoneMatch = text.match(/(?:\+?\d{1,3}[\s.-]?)?(?:\(?\d{3}\)?[\s.-]?)\d{3}[\s.-]?\d{4}/);
  const linkMatch = text.match(/(?:https?:\/\/|linkedin\.com\/in\/|github\.com\/)\S+/i);

  const buckets = {
    summary: [],
    education: [],
    skills: [],
    projects: [],
    experience: [],
    internships: [],
    certifications: [],
    achievements: [],
  };

  let current = 'summary';
  for (const line of lines) {
    const cleanHead = line.replace(/^[#*\-\d.\s]+/, '').replace(/[:\-–—|]+$/, '').trim().toLowerCase();
    if (/^(professional\s+)?summary|objective|profile$/.test(cleanHead)) { current = 'summary'; continue; }
    if (/^education|academics|academic background$/.test(cleanHead)) { current = 'education'; continue; }
    if (/^(technical\s+)?skills|technologies|tech stack$/.test(cleanHead)) { current = 'skills'; continue; }
    if (/^(academic\s+|personal\s+|key\s+)?projects$/.test(cleanHead)) { current = 'projects'; continue; }
    if (/^(work\s+|professional\s+)?experience$/.test(cleanHead)) { current = 'experience'; continue; }
    if (/^internships?$/.test(cleanHead)) { current = 'internships'; continue; }
    if (/^certifications?|certificates?$/.test(cleanHead)) { current = 'certifications'; continue; }
    if (/^achievements?|awards?|honors?$/.test(cleanHead)) { current = 'achievements'; continue; }
    buckets[current].push(line);
  }

  return {
    fullName: userProfile?.name?.trim() || (lines[0] && lines[0].length < 48 ? lines[0] : ''),
    email: emailMatch?.[0] || userProfile?.email || '',
    phone: phoneMatch?.[0] || '',
    links: linkMatch?.[0] || '',
    summary: buckets.summary.slice(1).join('\n'),
    education: buckets.education.join('\n') || userProfile?.education || '',
    skills: buckets.skills.join('\n') || userProfile?.skills || '',
    projects: buckets.projects.join('\n'),
    experience: buckets.experience.join('\n'),
    internships: buckets.internships.join('\n'),
    certifications: buckets.certifications.join('\n'),
    achievements: buckets.achievements.join('\n'),
  };
}

export function ResumeBuilder({
  initialSourceText,
  userProfile,
  onSaveToVault,
  isAuthenticated = false,
}) {
  const [draftId, setDraftId] = useState(null);
  const [template, setTemplate] = useState('modern');
  const [sections, setSections] = useState(() => {
    if (!initialSourceText && !isAuthenticated) {
      const localDraft = safeReadStorage(GUEST_DRAFT_KEY);
      if (localDraft?.sections) {
        return localDraft.sections;
      }
    }
    return parseTextToSections(initialSourceText, userProfile);
  });
  const [isLoadingDraft, setIsLoadingDraft] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [draftError, setDraftError] = useState('');
  const [savedNotice, setSavedNotice] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      const localDraft = safeReadStorage(GUEST_DRAFT_KEY);
      if (localDraft?.template) setTemplate(localDraft.template);
      return;
    }

    let cancelled = false;
    setIsLoadingDraft(true);
    setDraftError('');

    backendWorkspaceApi
      .listResumeDrafts()
      .then((res) => {
        if (cancelled) return;
        const latest = res?.drafts?.[0];
        if (latest && !initialSourceText) {
          setDraftId(latest.draftId);
          setTemplate(latest.template || 'modern');
          if (latest.draftData && typeof latest.draftData === 'object') {
            setSections((prev) => ({ ...prev, ...latest.draftData }));
          }
        } else if (latest) {
          setDraftId(latest.draftId);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDraftError('Could not load saved drafts from server. You can continue editing safely.');
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDraft(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, initialSourceText]);

  useEffect(() => {
    if (initialSourceText) {
      setSections(parseTextToSections(initialSourceText, userProfile));
    }
  }, [initialSourceText, userProfile]);

  const updateField = (field, value) => {
    setSections((prev) => ({ ...prev, [field]: value }));
    if (savedNotice) setSavedNotice('');
    if (draftError) setDraftError('');
  };

  const activeTemplate = TEMPLATES.find((t) => t.id === template) || TEMPLATES[1];

  const handlePrintPdf = () => {
    window.print();
  };

  const handleSaveDraft = async () => {
    setDraftError('');
    setSavedNotice('');
    const title = `${sections.fullName?.trim() || 'Untitled'} Resume Draft`;

    if (!isAuthenticated) {
      safeWriteStorage(GUEST_DRAFT_KEY, { template, sections, updatedAt: new Date().toISOString() });
      setSavedNotice('Draft saved locally in your browser.');
      return;
    }

    setIsSavingDraft(true);
    try {
      const payload = {
        title,
        template,
        draftData: sections,
      };
      const res = draftId
        ? await backendWorkspaceApi.updateResumeDraft(draftId, payload)
        : await backendWorkspaceApi.createResumeDraft(payload);

      if (res?.draft?.draftId) {
        setDraftId(res.draft.draftId);
      }
      setSavedNotice(
        draftId
          ? 'Resume draft updated in your account.'
          : 'Resume draft saved to your account.'
      );
    } catch (err) {
      setDraftError(
        err?.message || 'Failed to save draft to server. Your unsaved edits are still preserved below.'
      );
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleSaveBuiltResume = () => {
    const compiled = [
      sections.fullName,
      [sections.email, sections.phone, sections.links].filter(Boolean).join(' | '),
      sections.summary ? `\nSummary\n${sections.summary}` : '',
      sections.education ? `\nEducation\n${sections.education}` : '',
      sections.skills ? `\nTechnical Skills\n${sections.skills}` : '',
      sections.projects ? `\nProjects\n${sections.projects}` : '',
      sections.experience ? `\nExperience\n${sections.experience}` : '',
      sections.internships ? `\nInternships\n${sections.internships}` : '',
      sections.certifications ? `\nCertifications\n${sections.certifications}` : '',
      sections.achievements ? `\nAchievements\n${sections.achievements}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    if (!compiled.trim()) return;
    onSaveToVault?.({
      name: `${sections.fullName || 'Custom'} Resume (${activeTemplate.label})`,
      text: compiled,
      classification: userProfile?.experienceLevel || 'Custom Built',
    });
    setSavedNotice('Saved formatted resume text to Resume Vault.');
  };

  const renderPreviewSection = (heading, content) => {
    if (!content?.trim()) return null;
    return (
      <div style={{ marginTop: '12px', breakInside: 'avoid', overflowWrap: 'anywhere' }}>
        <h4
          style={{
            fontSize: template === 'compact' ? '0.84rem' : '0.9rem',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: activeTemplate.accent,
            borderBottom: `1.5px solid ${activeTemplate.accent}`,
            paddingBottom: '3px',
            marginBottom: '6px',
          }}
        >
          {heading}
        </h4>
        <div
          style={{
            whiteSpace: 'pre-wrap',
            fontSize: template === 'compact' ? '0.8rem' : '0.85rem',
            lineHeight: 1.5,
            color: '#1E293B',
          }}
        >
          {content}
        </div>
      </div>
    );
  };

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="demo-banner no-print" style={{ justifyContent: 'flex-end' }}>
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isLoadingDraft}
          >
            <Save size={14} /> {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={handleSaveBuiltResume}>
            <Sparkles size={14} /> Save to Vault
          </Button>
          <Button type="button" variant="primary" size="sm" onClick={handlePrintPdf}>
            <Printer size={14} /> Download PDF
          </Button>
        </div>
      </div>

      {isLoadingDraft && (
        <div className="question-tip no-print" role="status">
          Loading your saved resume draft...
        </div>
      )}

      {draftError && (
        <div
          className="no-print"
          role="alert"
          style={{
            padding: '10px 14px',
            borderRadius: '10px',
            background: 'rgba(220, 38, 38, 0.1)',
            color: '#b91c1c',
            fontSize: '0.88rem',
          }}
        >
          {draftError}
        </div>
      )}

      {savedNotice && (
        <div className="question-tip no-print" role="status">
          {savedNotice}
        </div>
      )}

      <div className="grid-2 resume-builder-grid">
        <Card
          title="Editable Resume Sections"
          subtitle="Fill or refine each section before exporting"
          className="no-print"
          action={
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSections(parseTextToSections('', userProfile))}
            >
              <RotateCcw size={14} /> Reset
            </Button>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div className="form-field">
              <label className="form-label" htmlFor="rb-template">Resume Template</label>
              <select
                id="rb-template"
                className="form-select"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
              >
                {TEMPLATES.map((t) => (
                  <option key={t.id} value={t.id}>{t.label}</option>
                ))}
              </select>
            </div>

            <div className="grid-2 resume-builder-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="rb-name">Full Name</label>
                <input
                  id="rb-name"
                  className="form-input"
                  value={sections.fullName}
                  onChange={(e) => updateField('fullName', e.target.value)}
                  placeholder="Alex Rivera"
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="rb-email">Email</label>
                <input
                  id="rb-email"
                  className="form-input"
                  value={sections.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="alex@university.edu"
                />
              </div>
            </div>

            <div className="grid-2 resume-builder-grid">
              <div className="form-field">
                <label className="form-label" htmlFor="rb-phone">Phone</label>
                <input
                  id="rb-phone"
                  className="form-input"
                  value={sections.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="(555) 123-4567"
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="rb-links">GitHub / LinkedIn / Portfolio</label>
                <input
                  id="rb-links"
                  className="form-input"
                  value={sections.links}
                  onChange={(e) => updateField('links', e.target.value)}
                  placeholder="github.com/alexrivera"
                />
              </div>
            </div>

            {[
              ['summary', 'Professional Summary', 70],
              ['education', 'Education', 80],
              ['skills', 'Technical Skills', 70],
              ['projects', 'Projects', 100],
              ['experience', 'Experience', 90],
              ['internships', 'Internships', 80],
              ['certifications', 'Certifications', 70],
              ['achievements', 'Achievements', 70],
            ].map(([key, label, minH]) => (
              <div className="form-field" key={key}>
                <label className="form-label" htmlFor={`rb-${key}`}>{label}</label>
                <textarea
                  id={`rb-${key}`}
                  className="form-textarea"
                  style={{ minHeight: `${minH}px` }}
                  value={sections[key]}
                  onChange={(e) => updateField(key, e.target.value)}
                  placeholder={`Enter ${label.toLowerCase()}...`}
                />
              </div>
            ))}
          </div>
        </Card>

        <Card
          title="Live Resume Preview"
          subtitle={`Template: ${activeTemplate.label}`}
          action={<Badge variant="blue">Print-Ready PDF</Badge>}
          className="resume-builder-preview-card"
        >
          <div
            id="resume-print-sheet"
            style={{
              background: '#FFFFFF',
              color: '#1E293B',
              padding: template === 'compact' ? '20px' : '26px',
              borderRadius: '10px',
              border: '1px solid var(--border-subtle)',
              minHeight: '520px',
            }}
          >
            <div style={{ borderBottom: `2px solid ${activeTemplate.accent}`, paddingBottom: '10px' }}>
              <h3 style={{ fontSize: '1.35rem', color: activeTemplate.accent, margin: 0 }}>
                {sections.fullName || 'Your Name'}
              </h3>
              <p style={{ fontSize: '0.82rem', color: '#475569', marginTop: '4px' }}>
                {[sections.email, sections.phone, sections.links].filter(Boolean).join(' · ') ||
                  'email@example.com · github.com/username'}
              </p>
            </div>

            {renderPreviewSection('Professional Summary', sections.summary)}
            {renderPreviewSection('Education', sections.education)}
            {renderPreviewSection('Technical Skills', sections.skills)}
            {renderPreviewSection('Projects', sections.projects)}
            {renderPreviewSection('Experience', sections.experience)}
            {renderPreviewSection('Internships', sections.internships)}
            {renderPreviewSection('Certifications', sections.certifications)}
            {renderPreviewSection('Achievements', sections.achievements)}
          </div>
        </Card>
      </div>
    </div>
  );
}
