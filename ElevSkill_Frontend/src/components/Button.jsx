import './components.css';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  className = '',
  ...props
}) {
  const sizeClass = size === 'sm' ? 'btn-sm' : '';
  return (
    <button
      type={type}
      className={`btn btn-${variant} ${sizeClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
}
