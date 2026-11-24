import { useState, useEffect } from 'react';
import { Send, ChevronRight, ChevronLeft, RefreshCw, Shuffle } from 'lucide-react';
import { Card } from '../components/Card';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { ProgressBar } from '../components/ProgressBar';
import { INTERVIEW_CATEGORIES, INTERVIEW_QUESTIONS } from '../data/interviewQuestions';
import {
  checkInterviewCoachHealth,
  evaluateInterviewAnswer,
} from '../services/interviewCoachApi';
import './pages.css';

const DIMENSION_LABELS = {
  relevance: 'Question Relevance',
  star_completeness: 'STAR Completeness',
  role_alignment: 'Role & Motivation Alignment',
  concept_coverage: 'Behavioral Themes',
  conceptual_understanding: 'Conceptual Understanding',
  completeness: 'Completeness',
  clarity: 'Clarity',
  communication: 'Communication',
  practical_application: 'Practical Application',
};

export function InterviewCoach({
  onLogActivity,
  onRecordSession,
  interviewHistory = [],
  isAuthenticated = false,
}) {
  const [category, setCategory] = useState('behavioral');
  const [difficultyFilter, setDifficultyFilter] = useState('all');
  const [questionIndex, setQuestionIndex] = useState(0);
  const [seenIds, setSeenIds] = useState(() => new Set(['beh-1']));
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [apiError, setApiError] = useState('');
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [health, setHealth] = useState({
    checking: true,
    ok: false,
    degraded: false,
    reachable: false,
  });

  const allCategoryQuestions = INTERVIEW_QUESTIONS[category] || [];
  const questions =
    difficultyFilter === 'all'
      ? allCategoryQuestions
      : allCategoryQuestions.filter((q) => q.difficulty === difficultyFilter);
  const safeIndex = questions.length > 0 ? Math.min(questionIndex, questions.length - 1) : 0;
  const currentQuestion = questions[safeIndex] || allCategoryQuestions[0];

  const markQuestionSeen = (q) => {
    if (!q?.id) return;
    setSeenIds((prev) => {
      const next = new Set(prev);
      next.add(q.id);
      return next;
    });
  };

  const refreshHealth = async () => {
    setHealth((prev) => ({ ...prev, checking: true }));
    const status = await checkInterviewCoachHealth();
    setHealth({ checking: false, ...status });
  };

  useEffect(() => {
    let active = true;
    checkInterviewCoachHealth().then((status) => {
      if (active) {
        setHealth({ checking: false, ...status });
      }
    });
    return () => {
      active = false;
    };
  }, []);

  const handleCategoryChange = (newCategory) => {
    setCategory(newCategory);
    setQuestionIndex(0);
    const list = INTERVIEW_QUESTIONS[newCategory] || [];
    const firstMatch =
      difficultyFilter === 'all'
        ? list[0]
        : list.find((q) => q.difficulty === difficultyFilter) || list[0];
    markQuestionSeen(firstMatch);
    setAnswer('');
    setError('');
    setApiError('');
    setFeedback(null);
  };

  const handleDifficultyChange = (newDiff) => {
    setDifficultyFilter(newDiff);
    setQuestionIndex(0);
    setAnswer('');
    setError('');
    setApiError('');
    setFeedback(null);
  };

  const handlePrevQuestion = () => {
    if (questions.length === 0) return;
    const prevIdx = (safeIndex - 1 + questions.length) % questions.length;
    setQuestionIndex(prevIdx);
    markQuestionSeen(questions[prevIdx]);
    setAnswer('');
    setError('');
    setApiError('');
    setFeedback(null);
  };

  const handleNextQuestion = () => {
    if (questions.length === 0) return;
    const nextIdx = (safeIndex + 1) % questions.length;
    setQuestionIndex(nextIdx);
    markQuestionSeen(questions[nextIdx]);
    setAnswer('');
    setError('');
    setApiError('');
    setFeedback(null);
  };

  const handleRandomQuestion = () => {
    if (questions.length === 0) return;
    const unvisited = questions
      .map((q, idx) => ({ q, idx }))
      .filter(({ q }) => q.id !== currentQuestion?.id && !seenIds.has(q.id));
    const pool =
      unvisited.length > 0
        ? unvisited
        : questions
            .map((q, idx) => ({ q, idx }))
            .filter(({ q }) => q.id !== currentQuestion?.id);
    if (pool.length === 0) return;
    const chosen = pool[Math.floor(Math.random() * pool.length)];
    if (unvisited.length === 0) {
      // Reset session seen set for this category slice when all have been practiced
      setSeenIds(new Set([chosen.q.id]));
    } else {
      markQuestionSeen(chosen.q);
    }
    setQuestionIndex(chosen.idx);
    setAnswer('');
    setError('');
    setApiError('');
    setFeedback(null);
  };

  const runEvaluation = async () => {
    if (isEvaluating) return;
    if (!answer.trim()) {
      setError('Please write your answer draft before requesting feedback.');
      return;
    }

    setError('');
    setApiError('');
    setIsEvaluating(true);

    try {
      const data = await evaluateInterviewAnswer(answer, category, {
        questionId: currentQuestion?.id,
        questionText: currentQuestion?.question,
      });
      setFeedback(data);
      setHealth({
        checking: false,
        reachable: true,
        ok: true,
        degraded: false,
        modelLoaded: true,
      });
      onLogActivity?.({
        title: `Practiced ${category} interview question`,
        category: 'Interview Coach',
        badge: `${data.overall_score}/100`,
        variant: 'purple',
      });
      onRecordSession?.({
        score: data.overall_score,
        category,
        questionText: currentQuestion?.question || '',
      });
    } catch (err) {
      setFeedback(null);
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
            : 'Interview Coach service is currently unavailable.'
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
      setIsEvaluating(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    runEvaluation();
  };

  const dimensionEntries = feedback?.dimension_scores
    ? Object.keys(DIMENSION_LABELS)
        .filter((key) => typeof feedback.dimension_scores[key] === 'number')
        .map((key) => ({
          key,
          label: DIMENSION_LABELS[key],
          value: feedback.dimension_scores[key],
          max: feedback.dimension_scores[`${key}_max`] || 20,
        }))
    : [];

  return (
    <div className="page-enter" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Card
        title="Select Interview Domain & Difficulty"
        subtitle="153 questions across 17 domains (Beginner, Intermediate, Advanced)"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <select
              aria-label="Filter by difficulty"
              className="form-select"
              style={{ width: 'auto', minWidth: '140px' }}
              value={difficultyFilter}
              onChange={(e) => handleDifficultyChange(e.target.value)}
              disabled={isEvaluating}
            >
              <option value="all">All Levels (9)</option>
              <option value="beginner">Beginner (3)</option>
              <option value="intermediate">Intermediate (3)</option>
              <option value="advanced">Advanced (3)</option>
            </select>
          </div>
        }
      >
        <div className="pill-tabs" role="tablist" aria-label="Interview categories">
          {INTERVIEW_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              role="tab"
              aria-selected={category === cat.id}
              className={`pill-tab ${category === cat.id ? 'active' : ''}`}
              onClick={() => handleCategoryChange(cat.id)}
              disabled={isEvaluating}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </Card>

      <div className="grid-2">
        <Card
          title={`Question ${safeIndex + 1} of ${questions.length}`}
          subtitle="Read the prompt and draft your response below"
          action={
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePrevQuestion}
                disabled={isEvaluating || questions.length <= 1}
                aria-label="Previous question"
              >
                <ChevronLeft size={15} /> Prev
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleRandomQuestion}
                disabled={isEvaluating || questions.length <= 1}
                aria-label="Random unvisited question"
              >
                <Shuffle size={14} /> Random
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleNextQuestion}
                disabled={isEvaluating || questions.length <= 1}
              >
                Next <ChevronRight size={15} />
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="question-box">
              {currentQuestion?.difficulty && (
                <div style={{ marginBottom: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <Badge variant={currentQuestion.difficulty === 'advanced' ? 'warning' : currentQuestion.difficulty === 'intermediate' ? 'blue' : 'success'}>
                    {currentQuestion.difficulty.charAt(0).toUpperCase() + currentQuestion.difficulty.slice(1)}
                  </Badge>
                </div>
              )}
              <p className="question-text">{currentQuestion?.question}</p>
              <div className="question-tip">
                <strong>Coaching Tip:</strong> {currentQuestion?.tips}
              </div>
            </div>

            <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-field">
                <label className="form-label" htmlFor="interview-answer">
                  <span>Your Answer</span>
                  <span className="text-muted">
                    {answer.trim() ? answer.trim().split(/\s+/).length : 0} words
                  </span>
                </label>
                <textarea
                  id="interview-answer"
                  className="form-textarea"
                  value={answer}
                  onChange={(e) => {
                    setAnswer(e.target.value);
                    if (error) setError('');
                    if (apiError) setApiError('');
                  }}
                  placeholder="Write your response using the STAR method or clear technical examples..."
                />
              </div>

              {error && (
                <div className="validation-error" role="alert">
                  {error}
                </div>
              )}

              {apiError && (
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
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={runEvaluation}
                    disabled={isEvaluating}
                  >
                    Retry
                  </Button>
                </div>
              )}

              <div className="action-row" style={{ marginTop: 0 }}>
                <Button type="submit" variant="primary" disabled={isEvaluating}>
                  <Send size={15} /> {isEvaluating ? 'Evaluating...' : 'Evaluate Answer'}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  disabled={isEvaluating}
                  onClick={() => {
                    setAnswer('');
                    setError('');
                    setApiError('');
                    setFeedback(null);
                  }}
                >
                  Clear Answer
                </Button>
              </div>
            </form>
          </div>
        </Card>

        <Card
          title="Answer Evaluation"
          subtitle="AI-assisted rubric and semantic alignment feedback"
          action={
            feedback ? (
              <Badge variant="purple">{feedback.category.toUpperCase()}</Badge>
            ) : null
          }
        >
          {isEvaluating ? (
            <div className="empty-state">
              Evaluating your answer...
            </div>
          ) : !feedback ? (
            <div className="empty-state">
              Write your answer on the left and submit it to see rubric alignment, concept coverage, and improvement suggestions.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              <div className="score-highlight">
                <div className="score-circle">{feedback.overall_score}</div>
                <div>
                  <h4 style={{ fontSize: '1.05rem', marginBottom: '4px' }}>
                    Rubric Alignment Indicator
                  </h4>
                  <p className="text-small text-muted">
                    {feedback.diagnostics?.word_count || 0} words ·{' '}
                    {feedback.diagnostics?.sentence_count || 0} sentence(s) · Question alignment:{' '}
                    {Math.round((feedback.question_relevance_similarity || 0) * 100)}%
                  </p>
                </div>
              </div>

              {dimensionEntries.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <h4 style={{ fontSize: '0.92rem' }}>Dimension Breakdown</h4>
                  {dimensionEntries.map((dim, idx) => (
                    <ProgressBar
                      key={dim.key}
                      label={`${dim.label} (${dim.value}/${dim.max})`}
                      value={(dim.value / dim.max) * 100}
                      tone={idx % 3 === 0 ? 'purple' : idx % 3 === 1 ? 'blue' : 'green'}
                    />
                  ))}
                </div>
              )}

              {feedback.star_assessment && (
                <div>
                  <h4 style={{ fontSize: '0.92rem' }}>STAR Structure Assessment</h4>
                  <div className="chip-group">
                    {Object.entries(feedback.star_assessment).map(([part, info]) => (
                      <span
                        key={part}
                        className={`chip ${info.present ? 'chip-match' : 'chip-miss'}`}
                        style={{ textTransform: 'capitalize' }}
                      >
                        {part}: {info.present ? 'Present' : 'Missing'}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h4 style={{ fontSize: '0.92rem' }}>
                  Covered Concepts ({feedback.covered_concepts?.length || 0})
                </h4>
                {feedback.covered_concepts?.length > 0 ? (
                  <div className="chip-group">
                    {feedback.covered_concepts.map((concept) => (
                      <span key={concept} className="chip chip-match">
                        {concept}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-small text-muted" style={{ marginTop: '6px' }}>
                    No expected rubric concepts were strongly matched yet.
                  </p>
                )}
              </div>

              {feedback.missing_concepts?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.92rem' }}>
                    Missing Concepts ({feedback.missing_concepts.length})
                  </h4>
                  <div className="chip-group">
                    {feedback.missing_concepts.map((concept) => (
                      <span key={concept} className="chip chip-miss">
                        {concept}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {feedback.strengths?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.92rem' }}>Strengths</h4>
                  <ul className="feedback-list">
                    {feedback.strengths.map((pt, idx) => (
                      <li key={idx}>
                        <span className="feedback-dot" />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.improvement_suggestions?.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '0.92rem' }}>Improvement Suggestions</h4>
                  <ul className="feedback-list">
                    {feedback.improvement_suggestions.map((pt, idx) => (
                      <li key={idx}>
                        <span className="feedback-dot" style={{ backgroundColor: 'var(--warning)' }} />
                        <span>{pt}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {feedback.illustrative_example && (
                <div className="question-tip">
                  <strong>Illustrative Improvement Template (Not a Candidate Answer):</strong>{' '}
                  {feedback.illustrative_example.replace(
                    /^Illustrative example \(template for improvement — not an actual candidate response\):\s*/i,
                    ''
                  )}
                </div>
              )}
            </div>
          )}
        </Card>
      </div>

      <Card
        title="Practice Summary & Evaluation History"
        subtitle={
          interviewHistory.length > 0
            ? `${interviewHistory.length} practice evaluation(s) · Average score: ${Math.round(
                interviewHistory.reduce((s, x) => s + x.score, 0) / interviewHistory.length
              )}/100`
            : isAuthenticated
              ? 'Your evaluated answers saved to your account appear here'
              : 'Your evaluated answers in this browser appear here'
        }
      >
        {interviewHistory.length === 0 ? (
          <div className="empty-state">
            No evaluated answers yet. Submit an answer above to build your practice history.
          </div>
        ) : (
          <div className="activity-list">
            {interviewHistory.slice(0, 8).map((item) => (
              <div key={item.id} className="activity-item">
                <div>
                  <div className="activity-title">
                    {item.questionText ? item.questionText.slice(0, 90) + (item.questionText.length > 90 ? '...' : '') : `${item.category} question`}
                  </div>
                  <div className="activity-meta">
                    {item.category.toUpperCase()} · {item.timeLabel}
                  </div>
                </div>
                <Badge variant={item.score >= 70 ? 'success' : 'purple'}>
                  {item.score}/100
                </Badge>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
