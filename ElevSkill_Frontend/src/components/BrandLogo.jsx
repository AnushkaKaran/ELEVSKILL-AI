import { useId } from 'react';

export function BrandLogo({ variant = 'full', size = 'md' }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `elevMarkGrad-${uid}`;
  const sparkleGradId = `elevSparkleGrad-${uid}`;
  const maskId = `elevMarkMask-${uid}`;

  // ~20% larger than previous sizes (32/36/44 -> 39/44/53) while preserving aspect ratio
  const iconHeight = size === 'sm' ? 38 : size === 'lg' ? 53 : 44;
  const iconWidth = Math.round((iconHeight * 72) / 64);
  const wordSize = size === 'sm' ? '1.22rem' : size === 'lg' ? '1.62rem' : '1.34rem';
  const taglineSize = size === 'sm' ? '0.76rem' : size === 'lg' ? '0.94rem' : '0.82rem';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '10px' : '13px',
        maxWidth: '100%',
      }}
    >
      <svg
        width={iconWidth}
        height={iconHeight}
        viewBox="0 0 72 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0, display: 'block' }}
      >
        <defs>
          <linearGradient id={gradId} x1="6" y1="52" x2="58" y2="16" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#C84BF8" />
            <stop offset="38%" stopColor="#7C5DFA" />
            <stop offset="72%" stopColor="#3B82F6" />
            <stop offset="100%" stopColor="#38BDF8" />
          </linearGradient>
          <linearGradient id={sparkleGradId} x1="48" y1="6" x2="66" y2="24" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#60B8FF" />
            <stop offset="100%" stopColor="#3B9EFF" />
          </linearGradient>
          <mask id={maskId}>
            <rect width="72" height="64" fill="black" />
            {/* Soft rounded chevron / delta A silhouette with arched bottom */}
            <path
              d="M25.6 11.4C27.8 7.5 32.8 7.5 35.0 11.4L55.2 46.6C57.6 50.8 53.6 55.6 49.0 54.0C43.2 52.0 37.0 47.4 30.3 47.4C23.6 47.4 17.4 52.0 11.6 54.0C7.0 55.6 3.0 50.8 5.4 46.6L25.6 11.4Z"
              fill="white"
            />
            {/* Sweeping upward trajectory cutout from bottom-left to upper-right slope */}
            <path
              d="M6.5 55.5C13.5 40.5 26.5 29.0 46.5 24.5"
              stroke="black"
              strokeWidth="4.4"
              strokeLinecap="round"
              fill="none"
            />
          </mask>
        </defs>

        <rect width="72" height="64" fill={`url(#${gradId})`} mask={`url(#${maskId})`} />

        {/* 4-point sparkle in upper-right */}
        <path
          d="M57.5 6.5Q58.8 14.2 66.5 15.5Q58.8 16.8 57.5 24.5Q56.2 16.8 48.5 15.5Q56.2 14.2 57.5 6.5Z"
          fill={`url(#${sparkleGradId})`}
        />
      </svg>

      {variant !== 'symbol' && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.12, minWidth: 0 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: wordSize,
              letterSpacing: '-0.015em',
              color: '#14244B',
              whiteSpace: 'nowrap',
            }}
          >
            ELEVSKILL{' '}
            <span
              style={{
                background: 'linear-gradient(90deg, #9353F8 0%, #5B8AF9 58%, #38BDF8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              AI
            </span>
          </span>
          {variant === 'full-tagline' && (
            <span
              style={{
                fontSize: taglineSize,
                fontWeight: 500,
                color: '#64708C',
                marginTop: '3px',
                letterSpacing: '-0.01em',
                whiteSpace: 'nowrap',
              }}
            >
              Build Skills. Elevate Your Future.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
