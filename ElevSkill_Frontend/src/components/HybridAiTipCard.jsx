import { useState, useEffect } from 'react';
import { Sparkles, Cpu, Cloud, AlertCircle } from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { generateHybridPromptResponse } from '../services/firebaseAiService';

const QUICK_PROMPTS = [
  'Give 3 concise tips for answering a behavioral STAR interview question.',
  'How should a fresher structure a software engineering project bullet point?',
];

function normalizeEscapedMarkdown(text) {
  return String(text || '')
    .replace(/\\([*_`~#[\]()>+\-.!])/g, '$1')
    .trim();
}

function renderInlineMarkdown(line, keyPrefix) {
  const parts = [];
  const tokenRe = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match;
  let idx = 0;

  while ((match = tokenRe.exec(line)) !== null) {
    if (match.index > lastIndex) {
      parts.push(line.slice(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      parts.push(<strong key={`${keyPrefix}-b-${idx}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`') && token.endsWith('`')) {
      parts.push(
        <code
          key={`${keyPrefix}-c-${idx}`}
          style={{
            padding: '1px 5px',
            borderRadius: '4px',
            background: 'rgba(109, 40, 217, 0.08)',
            fontSize: '0.86em',
          }}
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*') && token.endsWith('*')) {
      parts.push(<em key={`${keyPrefix}-i-${idx}`}>{token.slice(1, -1)}</em>);
    }
    lastIndex = tokenRe.lastIndex;
    idx += 1;
  }

  if (lastIndex < line.length) {
    parts.push(line.slice(lastIndex));
  }
  return parts.length > 0 ? parts : line;
}

function FormattedAiResponse({ text }) {
  const cleaned = normalizeEscapedMarkdown(text);
  const lines = cleaned.split(/\r?\n/);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      {lines.map((rawLine, idx) => {
        const line = rawLine.trim();
        if (!line) return <div key={`sp-${idx}`} style={{ height: '4px' }} />;

        const headingMatch = line.match(/^#{1,4}\s+(.+)$/);
        if (headingMatch) {
          return (
            <div key={`h-${idx}`} style={{ fontWeight: 700, fontSize: '0.94rem', marginTop: '4px' }}>
              {renderInlineMarkdown(headingMatch[1], `h-${idx}`)}
            </div>
          );
        }

        const bulletMatch = line.match(/^[-*•]\s+(.+)$/);
        if (bulletMatch) {
          return (
            <div key={`li-${idx}`} style={{ display: 'flex', gap: '8px', paddingLeft: '4px' }}>
              <span>•</span>
              <span>{renderInlineMarkdown(bulletMatch[1], `li-${idx}`)}</span>
            </div>
          );
        }

        const numMatch = line.match(/^(\d+[.)])\s+(.+)$/);
        if (numMatch) {
          return (
            <div key={`ol-${idx}`} style={{ display: 'flex', gap: '8px', paddingLeft: '4px' }}>
              <span style={{ fontWeight: 600 }}>{numMatch[1]}</span>
              <span>{renderInlineMarkdown(numMatch[2], `ol-${idx}`)}</span>
            </div>
          );
        }

        return (
          <p key={`p-${idx}`} style={{ margin: 0 }}>
            {renderInlineMarkdown(line, `p-${idx}`)}
          </p>
        );
      })}
    </div>
  );
}

export function HybridAiTipCard() {
  const [prompt, setPrompt] = useState(QUICK_PROMPTS[0]);
  const [loading, setLoading] = useState(false);
  const [isSlow, setIsSlow] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!loading) {
      setIsSlow(false);
      return undefined;
    }
    const timer = setTimeout(() => {
      setIsSlow(true);
    }, 15000);
    return () => clearTimeout(timer);
  }, [loading]);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const response = await generateHybridPromptResponse(prompt);
      setResult(response);
    } catch (err) {
      setError(err?.message || 'Firebase AI Logic request failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card
      title="Hybrid AI Quick Assistant"
      subtitle="Powered by Firebase AI Logic (prefers on-device Chrome Gemini Nano, falls back to cloud Gemini)"
      action={
        result ? (
          <Badge variant={result.inferenceSource === 'ON_DEVICE' ? 'success' : 'blue'}>
            {result.inferenceSource === 'ON_DEVICE' ? (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Cpu size={12} /> ON_DEVICE
              </span>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <Cloud size={12} /> {result.inferenceSource}
              </span>
            )}
          </Badge>
        ) : null
      }
    >
      <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div className="form-field">
          <label className="form-label" htmlFor="hybrid-ai-prompt">
            Ask a quick career prep question (avoid pasting personal contact info)
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              id="hybrid-ai-prompt"
              type="text"
              className="form-input"
              style={{ flex: '1 1 260px' }}
              placeholder="Ask for a quick interview or resume tip..."
              value={prompt}
              disabled={loading}
              onChange={(e) => setPrompt(e.target.value)}
            />
            <Button type="submit" variant="primary" size="sm" disabled={loading}>
              <Sparkles size={14} /> {loading ? 'Generating...' : 'Generate'}
            </Button>
          </div>
        </div>

        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div className="text-small text-muted" role="status">
              Generating concise response (preferring on-device AI when available)...
            </div>
            {isSlow && (
              <div className="question-tip" style={{ margin: 0 }} role="status">
                Generating is taking longer than expected (on-device initialization or cloud Gemini fallback in progress) — please wait while it completes.
              </div>
            )}
          </div>
        )}

        {error && (
          <div
            className="validation-error"
            role="alert"
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {result && (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              background: 'var(--bg-app)',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.9rem',
              lineHeight: 1.55,
            }}
          >
            <FormattedAiResponse text={result.text} />
          </div>
        )}
      </form>
    </Card>
  );
}
