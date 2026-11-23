import './components.css';

export function Card({ title, subtitle, action, children, className = '', interactive = false }) {
  return (
    <section className={`card ${interactive ? 'card-interactive' : ''} ${className}`.trim()}>
      {(title || subtitle || action) && (
        <header className="card-header">
          <div>
            {title && <h3 className="card-title">{title}</h3>}
            {subtitle && <p className="card-subtitle">{subtitle}</p>}
          </div>
          {action && <div>{action}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function StatCard({ label, value, hint, icon: Icon, tone = 'purple' }) {
  return (
    <div className={`card stat-card stat-card-${tone}`}>
      <div className="stat-top">
        <span className="stat-label">{label}</span>
        {Icon && (
          <span className={`stat-icon-wrap ${tone}`}>
            <Icon size={18} />
          </span>
        )}
      </div>
      <div className="stat-value">{value}</div>
      {hint && <div className="stat-hint">{hint}</div>}
    </div>
  );
}
