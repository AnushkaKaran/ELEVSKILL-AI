import './components.css';

export function ProgressBar({ label, value = 0, tone = 'purple', showPercent = true }) {
  const clamped = Math.max(0, Math.min(100, Math.round(value)));

  return (
    <div className="progress-wrap">
      {(label || showPercent) && (
        <div className="progress-header">
          <span className="progress-label">{label}</span>
          {showPercent && <span className="progress-percent">{clamped}%</span>}
        </div>
      )}
      <div className="progress-track" role="progressbar" aria-valuenow={clamped} aria-valuemin={0} aria-valuemax={100}>
        <div className={`progress-fill ${tone}`} style={{ width: `${clamped}%` }} />
      </div>
    </div>
  );
}
