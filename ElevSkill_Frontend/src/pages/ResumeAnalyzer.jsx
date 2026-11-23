import { useState, useEffect, useRef } from 'react';
import { Sparkles, RotateCcw, RefreshCw, Upload, Save, Copy, Check, GitCompare, FileEdit } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { ProgressBar } from '../components/ProgressBar';
import { SAMPLE_RESUME_TEXT, SAMPLE_JOB_DESCRIPTION } from '../data/sampleData';
import { getResumeStatusLabel } from '../utils/dashboardStore';
import {
  checkResumeAnalyzerHealth,
  analyzeResumeWithApi,
  extractPdfResumeText,
} from '../services/resumeAnalyzerApi';
import './pages.css';

export function ResumeAnalyzer({
  initialResumeText = '',
  onRecordAnalysis,
  onSaveResume,
  onSendToJobMatcher,
  onOpenInBuilder,
}) {
  const [resumeText, setResumeText] = useState(initialResumeText || '');
  const [jobText, setJobText] = useState('');
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState('');
  const [pdfStatus, setPdfStatus] = useState('');
  const [uploadedPdfMeta, setUploadedPdfMeta] = useState(null);
  const [saveName, setSaveName] = useState('');
  const [retainPdfFile, setRetainPdfFile] = useState(false);
  const [saveNotice, setSaveNotice] = useState('');
  const [copiedKey, setCopiedKey] = useState('');
  const [isExtractingPdf, setIsExtractingPdf] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState(null);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (initialResumeText) {
      setResumeText(initialResumeText);
      setResult(null);
      setSaveNotice('');
    }
  }, [initialResumeText]);
  const [health, setHealth] = useState({
    checking: true,
    ok: false,
    reachable: false,
  });

  const refreshHealth = async () => {
    setHealth((prev) => ({ ...prev, checking: true }));
    const status = await checkResumeAnalyzerHealth();
    setHealth({ checking: false, ...status });
  };

  useEffect(() => {
    let active = true;
    checkResumeAnalyzerHealth().then((status) => {
      if (active) {
        setHealth({ checking: false, ...status });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const runAnalysis = async () => {
    if (isAnalyzing) return;
    if (!resumeText.trim()) {
      setError('Please enter your resume text before running the analysis.');
      return;
    }

    setError('');
    setApiError('');
    setIsAnalyzing(true);

    try {
      const data = await analyzeResumeWithApi(resumeText, jobText);
      setResult(data);
      setHealth({ checking: false, reachable: true, ok: true, modelLoaded: true });
      onRecordAnalysis?.({
        score: data.overall_score,
        analyzedAt: new Date().toISOString(),
        status: getResumeStatusLabel(data.overall_score),
        wordCount: data.quality_analysis?.word_count || 0,
      });
    } catch (err) {
      if (err?.status === 422 || err?.code === 'VALIDATION_ERROR') {
        setError(err.message);
        setHealth({ checking: false, reachable: true, ok: true, modelLoaded: true });
      } else {
        setApiError(
          err instanceof Error
            ? err.message
            : 'Resume Analyzer service is currently unavailable.'
        );
        setHealth((prev) => ({
          ...prev,
          checking: false,
          ok: false,
          reachable: err?.code !== 'NETWORK_ERROR',
        }));
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAnalyze = (e) => {
    e.preventDefault();
    runAnalysis();
  };

  const handleLoadSample = () => {
    setError('');
    setApiError('');
    setPdfStatus('');
    setResumeText(SAMPLE_RESUME_TEXT);
    setJobText(SAMPLE_JOB_DESCRIPTION);
    setResult(null);
  };

  const handleClear = () => {
    setResumeText('');
    setJobText('');
    setError('');
    setApiError('');
    setPdfStatus('');
    setUploadedPdfMeta(null);
    setSaveName('');
    setRetainPdfFile(false);
    setSaveNotice('');
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSaveToVault = () => {
    if (!resumeText.trim() || !onSaveResume) return;
    const defaultName =
      saveName.trim() ||
      uploadedPdfMeta?.filename?.replace(/\.pdf$/i, '') ||
      `Resume (${new Date().toLocaleDateString()})`;
    onSaveResume({
      name: defaultName,
      text: resumeText,
      lastScore: result?.overall_score ?? null,
      classification: result?.candidate_profile?.label || '',
      originalFileName: retainPdfFile ? uploadedPdfMeta?.filename || null : null,
      originalFileDataUrl: retainPdfFile ? uploadedPdfMeta?.dataUrl || null : null,
    });
    setSaveNotice(`Saved "${defaultName}" to Resume Vault.`);
  };

  const handleCopyText = async (key, textVal) => {
    try {
      await navigator.clipboard.writeText(textVal);
      setCopiedKey(key);
      setTimeout(() => setCopiedKey(''), 1800);
    } catch {
      // ignore
    }
  };

  const handlePdfUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError('');
    setApiError('');
    setPdfStatus('');
    setSaveNotice('');

    if (!file.name.toLowerCase().endsWith('.pdf')) {
      setError('Invalid file type. Please select a PDF (.pdf) resume.');
      e.target.value = '';
      return;
    }

    setIsExtractingPdf(true);
    try {
      const data = await extractPdfResumeText(file);
      setResumeText(data.extracted_text || '');
      setResult(null);
      setSaveName(file.name.replace(/\.pdf$/i, ''));

      if (file.size <= 1.5 * 1024 * 1024) {
        const reader = new FileReader();
        reader.onload = () => {
          setUploadedPdfMeta({
            filename: file.name,
            dataUrl: typeof reader.result === 'string' ? reader.result : null,
          });
        };
        reader.readAsDataURL(file);
      } else {
        setUploadedPdfMeta({ filename: file.name, dataUrl: null });
      }

      setPdfStatus(
        `Extracted ${data.page_count || 1} page(s) from "${data.filename}" (temporary upload — not saved unless you choose Save to Vault).`
      );
      setHealth({ checking: false, reachable: true, ok: true, modelLoaded: true });
    } catch (err) {
      if (err?.status === 422 || err?.code === 'VALIDATION_ERROR') {
        setError(err.message);
        setHealth({ checking: false, reachable: true, ok: true, modelLoaded: true });
      } else {
        setApiError(
          err instanceof Error ? err.message : 'Unable to extract text from PDF.'
        );
      }
    } finally {
      setIsExtractingPdf(false);
      e.target.value = '';
    }
  };

  const semanticPct =
    result?.semantic_relevance?.overall_similarity !== undefined &&
    result?.semantic_relevance?.overall_similarity !== null
      ? Math.round(result.semantic_relevance.overall_similarity * 100)
      : null;

  const lexicalPct =
    result?.semantic_relevance?.lexical_tfidf_similarity !== undefined &&
    result?.semantic_relevance?.lexical_tfidf_similarity !== null
      ? Math.round(result.semantic_relevance.lexical_tfidf_similarity * 100)
      : null;

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="grid-2">
        <Card
          title="Resume & Target Job Input"
          subtitle="Upload a PDF or paste your resume text and optional job description"
          action={
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handlePdfUpload}
                style={{ display: 'none' }}
                aria-label="Upload PDF resume"
              />
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isExtractingPdf || isAnalyzing}
              >
                <Upload size={14} /> {isExtractingPdf ? 'Extracting PDF...' : 'Upload PDF'}
              </Button>
            </>
          }
        >
          <form onSubmit={handleAnalyze} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {pdfStatus && (
              <div
                style={{
                  padding: '10px 12px',
                  borderRadius: '10px',
                  background: 'var(--bg-soft, #f5f3ff)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '0.86rem',
                }}
                role="status"
              >
                {pdfStatus}
              </div>
            )}
            <div className="form-field">
              <label className="form-label" htmlFor="resume-input">
                <span>Resume Text</span>
                <span className="text-muted">
                  {resumeText.trim() ? resumeText.trim().split(/\s+/).length : 0} words
                </span>
              </label>
              <textarea
                id="resume-input"
                className="form-textarea"
                value={resumeText}
                onChange={(e) => {
                  setResumeText(e.target.value);
                  if (error) setError('');
                  if (apiError) setApiError('');
                }}
                placeholder="Paste your resume content here..."
              />
            </div>

            <div className="form-field">
              <label className="form-label" htmlFor="jd-input">
                <span>Target Job Description (Optional)</span>
              </label>
              <textarea
                id="jd-input"
                className="form-textarea"
                style={{ minHeight: '130px' }}
                value={jobText}
                onChange={(e) => {
                  setJobText(e.target.value);
                  if (apiError) setApiError('');
                }}
                placeholder="Paste the job description to evaluate semantic relevance and missing skills..."
              />
            </div>

            {error && (
              <div className="validation-error" role="alert">
                {error}
              </div>
            )}

            {apiError && (
              <div className="validation-error" role="alert" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', flexWrap: 'wrap' }}>
                <span>{apiError}</span>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={runAnalysis}
                  disabled={isAnalyzing}
                >
                  Retry
                </Button>
              </div>
            )}

            <div className="action-row" style={{ marginTop: 0 }}>
              <Button type="submit" variant="primary" disabled={isAnalyzing}>
                <Sparkles size={16} /> {isAnalyzing ? 'Analyzing...' : 'Analyze Resume'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={handleLoadSample}
                disabled={isAnalyzing}
              >
                <RotateCcw size={15} /> Load Sample Text
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleClear}
                disabled={isAnalyzing}
              >
                Clear
              </Button>
              {resumeText.trim() && (
                <>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyText('resume', resumeText)}
                  >
                    {copiedKey === 'resume' ? <Check size={14} /> : <Copy size={14} />}
                    {copiedKey === 'resume' ? 'Copied' : 'Copy Text'}
                  </Button>
                  {onSendToJobMatcher && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onSendToJobMatcher(resumeText)}
                    >
                      <GitCompare size={14} /> Job Matcher
                    </Button>
                  )}
                  {onOpenInBuilder && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenInBuilder(resumeText)}
                    >
                      <FileEdit size={14} /> Resume Builder
                    </Button>
                  )}
                </>
              )}
            </div>

            {resumeText.trim() && onSaveResume && (
              <div
                style={{
                  padding: '12px',
                  borderRadius: '10px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                  <input
                    type="text"
                    className="form-input"
                    style={{ flex: '1 1 180px' }}
                    aria-label="Resume name for Vault"
                    placeholder="Resume name (e.g., Frontend Internship v1)"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                  />
                  <Button type="button" variant="secondary" size="sm" onClick={handleSaveToVault}>
                    <Save size={14} /> Save to Vault
                  </Button>
                </div>
                {uploadedPdfMeta?.dataUrl && (
                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    <input
                      type="checkbox"
                      checked={retainPdfFile}
                      onChange={(e) => setRetainPdfFile(e.target.checked)}
                    />
                    Also retain original uploaded PDF ({uploadedPdfMeta.filename}) for future download
                  </label>
                )}
                {saveNotice && (
                  <div className="text-small" style={{ color: 'var(--success)' }} role="status">
                    {saveNotice}
                  </div>
                )}
              </div>
            )}
          </form>
        </Card>

        <Card
          title="Analysis Results"
          subtitle="Structured resume evaluation and job keyword alignment"
          action={
            result ? (
              <Badge variant="purple">{getResumeStatusLabel(result.overall_score)}</Badge>
            ) : null
          }
        >
          {isAnalyzing ? (
            <div className="empty-state">
              Analyzing your resume...
            </div>
          ) : !result ? (
            <div className="empty-state">
              No resume analysis yet. Paste your resume on the left and click <strong>Analyze Resume</strong>.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="score-highlight">
                <div className="score-circle">{result.overall_score}</div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>
                    Overall Resume Score ({getResumeStatusLabel(result.overall_score)})
                  </h4>
                  <p className="text-small text-muted">
                    {result.candidate_profile?.label ? `${result.candidate_profile.label} · ` : ''}
                    {result.quality_analysis?.word_count || 0} words ·{' '}
                    {result.quality_analysis?.bullet_count || 0} bullet(s) ·{' '}
                    {result.quality_analysis?.quantified_bullets || 0} quantified
                  </p>
                </div>
              </div>

              {result.score_breakdown && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '0.92rem' }}>Score Breakdown</h4>
                  <ProgressBar
                    label={`Structure (${result.score_breakdown.structure_score}/${result.score_breakdown.structure_max})`}
                    value={(result.score_breakdown.structure_score / result.score_breakdown.structure_max) * 100}
                    tone="purple"
                  />
                  <ProgressBar
                    label={`Skills (${result.score_breakdown.skills_score}/${result.score_breakdown.skills_max})`}
                    value={(result.score_breakdown.skills_score / result.score_breakdown.skills_max) * 100}
                    tone="blue"
                  />
                  {result.score_breakdown.semantic_relevance_score !== null && (
                    <ProgressBar
                      label={`Semantic Relevance (${result.score_breakdown.semantic_relevance_score}/${result.score_breakdown.semantic_relevance_max})`}
                      value={(result.score_breakdown.semantic_relevance_score / result.score_breakdown.semantic_relevance_max) * 100}
                      tone="green"
                    />
                  )}
                  <ProgressBar
                    label={`Writing Quality (${result.score_breakdown.quality_score}/${result.score_breakdown.quality_max})`}
                    value={(result.score_breakdown.quality_score / result.score_breakdown.quality_max) * 100}
                    tone="purple"
                  />
                </div>
              )}

              {semanticPct !== null && (
                <div>
                  <h4 style={{ fontSize: '0.92rem' }}>Job Description Relevance</h4>
                  <p className="text-small text-muted" style={{ marginTop: '4px' }}>
                    Semantic Similarity: <strong>{semanticPct}%</strong> · Keyword Overlap:{' '}
                    <strong>{lexicalPct}%</strong>
                  </p>
                  {Array.isArray(result.semantic_relevance?.section_relevances) &&
                    result.semantic_relevance.section_relevances.length > 0 && (
                      <ul className="feedback-list">
                        {result.semantic_relevance.section_relevances.slice(0, 3).map((sec) => (
                          <li key={sec.section}>
                            <span className="feedback-dot" />
                            <span>
                              <strong style={{ textTransform: 'capitalize' }}>{sec.section}</strong> (
                              {Math.round(sec.similarity * 100)}%): {sec.reason}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                </div>
              )}

              {result.section_assessment && (
                <div>
                  <h4 style={{ fontSize: '0.92rem' }}>Section Assessment</h4>
                  <div className="chip-group">
                    {Object.entries(result.section_assessment).map(([secName, info]) => (
                      <span
                        key={secName}
                        className={`chip ${info.status === 'present' ? 'chip-match' : 'chip-miss'}`}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {secName}: {info.status}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 style={{ fontSize: '0.92rem' }}>
                  Detected Technical Skills ({result.skills_analysis?.detected_skills?.length || 0})
                </h4>
                {result.skills_analysis?.detected_skills?.length > 0 ? (
                  <div className="chip-group">
                    {result.skills_analysis.detected_skills.map((skill) => (
                      <span key={skill} className="chip chip-match">
                        {skill}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-small text-muted" style={{ marginTop: '6px' }}>
                    No technical skills from the taxonomy were detected.
                  </p>
                )}
              </div>

              {result.skills_analysis?.missing_job_skills?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.92rem' }}>
                    Missing Job-Related Skills ({result.skills_analysis.missing_job_skills.length})
                  </h4>
                  <div className="chip-group">
                    {result.skills_analysis.missing_job_skills.map((skill) => (
                      <span key={skill} className="chip chip-miss">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {result.strengths?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.92rem' }}>Strengths</h4>
                  <ul className="feedback-list">
                    {result.strengths.map((item, idx) => (
                      <li key={idx}>
                        <span className="feedback-dot" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {result.recommendations?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.92rem' }}>Improvement Recommendations</h4>
                  <ul className="feedback-list">
                    {result.recommendations.map((item, idx) => (
                      <li key={idx}>
                        <span className="feedback-dot" style={{ backgroundColor: 'var(--warning)' }} />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
