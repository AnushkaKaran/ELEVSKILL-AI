import { useState } from 'react';
import {
  Eye,
  Edit3,
  Sparkles,
  GitCompare,
  Copy,
  Download,
  Trash2,
  FileEdit,
  Check,
  AlertTriangle,
  X,
} from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { formatDateShort } from '../utils/dashboardStore';
import './pages.css';

export function ResumeVault({
  savedResumes,
  onUpdateResume,
  onDeleteResume,
  onReanalyze,
  onSendToJobMatcher,
  onOpenInBuilder,
}) {
  const [selectedId, setSelectedId] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editName, setEditName] = useState('');
  const [editText, setEditText] = useState('');
  const [copiedId, setCopiedId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  const selected = savedResumes.find((r) => r.id === selectedId) || null;

  const handleView = (item) => {
    setSelectedId(item.id);
    setEditMode(false);
    setEditName(item.name);
    setEditText(item.text);
  };

  const handleStartEdit = (item) => {
    setSelectedId(item.id);
    setEditMode(true);
    setEditName(item.name);
    setEditText(item.text);
  };

  const handleSaveEdit = (e) => {
    e.preventDefault();
    if (!selected || !editName.trim() || !editText.trim()) return;
    onUpdateResume(selected.id, {
      name: editName.trim(),
      text: editText,
      updatedAt: new Date().toISOString(),
    });
    setEditMode(false);
  };

  const handleCopy = async (item) => {
    try {
      await navigator.clipboard.writeText(item.text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const handleDownloadOriginal = (item) => {
    if (!item.originalFileDataUrl) return;
    const link = document.createElement('a');
    link.href = item.originalFileDataUrl;
    link.download = item.originalFileName || `${item.name}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const pendingDeleteResume = savedResumes.find((r) => r.id === confirmDeleteId) || null;

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="grid-2">
        <Card
          title="Saved Resumes"
          subtitle="Manage, reanalyze, or reuse your saved resume versions"
          action={<Badge variant="purple">{savedResumes.length} Saved</Badge>}
        >
          {savedResumes.length === 0 ? (
            <div className="empty-state">
              No resumes saved yet. Analyze or upload a resume in <strong>Resume Analyzer</strong> and click <strong>Save to Vault</strong> when you want to keep a copy.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {savedResumes.map((item) => (
                <div key={item.id} className="rec-card">
                  <div className="rec-top">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.96rem' }}>{item.name}</div>
                      <div className="text-small text-muted">
                        Saved {formatDateShort(item.savedAt)}
                        {item.classification ? ` · ${item.classification}` : ''}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {typeof item.lastScore === 'number' ? (
                        <Badge variant={item.lastScore >= 75 ? 'success' : 'blue'}>
                          Score: {item.lastScore}/100
                        </Badge>
                      ) : (
                        <Badge variant="neutral">Not analyzed</Badge>
                      )}
                      {item.originalFileDataUrl && <Badge variant="purple">PDF Retained</Badge>}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleView(item)}>
                      <Eye size={14} /> View
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleStartEdit(item)}>
                      <Edit3 size={14} /> Edit
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => onReanalyze(item)}>
                      <Sparkles size={14} /> Reanalyze
                    </Button>
                    <Button type="button" variant="secondary" size="sm" onClick={() => onSendToJobMatcher(item)}>
                      <GitCompare size={14} /> Job Matcher
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => onOpenInBuilder(item)}>
                      <FileEdit size={14} /> Builder
                    </Button>
                    <Button type="button" variant="ghost" size="sm" onClick={() => handleCopy(item)}>
                      {copiedId === item.id ? <Check size={14} /> : <Copy size={14} />}
                      {copiedId === item.id ? 'Copied' : 'Copy'}
                    </Button>
                    {item.originalFileDataUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownloadOriginal(item)}
                      >
                        <Download size={14} /> Original PDF
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDeleteId(item.id)}
                      aria-label={`Delete ${item.name}`}
                    >
                      <Trash2 size={14} /> Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          title={selected ? (editMode ? `Editing: ${selected.name}` : selected.name) : 'Resume Preview'}
          subtitle={
            selected
              ? `${selected.text.trim().split(/\s+/).length} words`
              : 'Select a saved resume to view or edit'
          }
        >
          {!selected ? (
            <div className="empty-state">
              Click <strong>View</strong> or <strong>Edit</strong> on any saved resume to inspect or update its contents.
            </div>
          ) : editMode ? (
            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-field">
                <label className="form-label" htmlFor="vault-edit-name">Resume Name</label>
                <input
                  id="vault-edit-name"
                  type="text"
                  className="form-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div className="form-field">
                <label className="form-label" htmlFor="vault-edit-text">Resume Content</label>
                <textarea
                  id="vault-edit-text"
                  className="form-textarea"
                  style={{ minHeight: '280px' }}
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                />
              </div>
              <div className="action-row" style={{ marginTop: 0 }}>
                <Button type="submit" variant="primary" size="sm">
                  Save Changes
                </Button>
                <Button type="button" variant="ghost" size="sm" onClick={() => setEditMode(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <pre
                style={{
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.88rem',
                  lineHeight: 1.55,
                  padding: '14px',
                  borderRadius: '10px',
                  background: 'var(--bg-app)',
                  border: '1px solid var(--border-subtle)',
                  maxHeight: '420px',
                  overflowY: 'auto',
                }}
              >
                {selected.text}
              </pre>
            </div>
          )}
        </Card>
      </div>

      {pendingDeleteResume && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="vault-delete-title"
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
              maxWidth: '420px',
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
                    background: 'rgba(220, 38, 38, 0.1)',
                    color: '#dc2626',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={18} />
                </span>
                <h3 id="vault-delete-title" style={{ margin: 0, fontSize: '1.05rem' }}>
                  Delete Saved Resume
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeleteId(null)}
                aria-label="Cancel deletion"
                style={{ padding: '6px', borderRadius: '8px', color: 'var(--text-muted)', background: 'transparent' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.92rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              Are you sure you want to permanently delete <strong>{pendingDeleteResume.name}</strong>? This action cannot be undone.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
              <Button type="button" variant="ghost" onClick={() => setConfirmDeleteId(null)}>
                Cancel
              </Button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ background: '#dc2626', borderColor: '#dc2626', color: '#ffffff' }}
                onClick={() => {
                  if (selectedId === pendingDeleteResume.id) setSelectedId(null);
                  setConfirmDeleteId(null);
                  onDeleteResume(pendingDeleteResume.id);
                }}
              >
                <Trash2 size={14} /> Delete Resume
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
