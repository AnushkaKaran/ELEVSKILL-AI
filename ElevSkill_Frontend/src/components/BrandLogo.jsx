import { useId } from 'react';

export function BrandLogo({ variant = 'full', size = 'md' }) {
  const uid = useId().replace(/:/g, '');
  const gradId = `elevPurpleGrad-${uid}`;
  const maskId = `elevHollowMask-${uid}`;

  const iconSize = size === 'sm' ? 32 : size === 'lg' ? 44 : 36;
  const wordSize = size === 'sm' ? '1.02rem' : size === 'lg' ? '1.35rem' : '1.12rem';

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '9px' : '11px',
      }}
    >
      <svg
        width={iconSize}
        height={iconSize}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient id={gradId} x1="10" y1="54" x2="54" y2="10" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6D28D9" />
            <stop offset="52%" stopColor="#7C3AED" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
          <mask id={maskId}>
            <rect width="64" height="64" fill="black" />
            {/* Soft curved, rounded triangular silhouette */}
            <path
              d="M27.4 13.8C29.6 9.8 34.4 9.8 36.6 13.8C42.2 23.6 47.4 33.2 51.8 41.8C53.8 45.7 51.0 50.4 46.6 50.4C37.2 50.8 26.8 50.8 17.4 50.4C13.0 50.4 10.2 45.7 12.2 41.8C16.6 33.2 21.8 23.6 27.4 13.8Z"
              fill="white"
            />
            {/* Genuinely hollow / transparent negative-space internal line detail */}
            <path
              d="M23.5 39.5C26.4 33.2 29.6 27.4 32.0 23.2C34.4 27.4 37.6 33.2 40.5 39.5"
              stroke="black"
              strokeWidth="4.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </mask>
        </defs>

        {/* Soft rounded purple-gradient symbol with genuine negative-space cutout */}
        <rect width="64" height="64" fill={`url(#${gradId})`} mask={`url(#${maskId})`} />

        {/* Subtle 4-point sparkle near upper-right */}
        <path
          d="M50.5 8.5L51.9 12.6L56.0 14.0L51.9 15.4L50.5 19.5L49.1 15.4L45.0 14.0L49.1 12.6L50.5 8.5Z"
          fill={`url(#${gradId})`}
        />
      </svg>

      {variant !== 'symbol' && (
        <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 800,
              fontSize: wordSize,
              letterSpacing: '-0.02em',
              color: '#1E293B',
            }}
          >
            ELEVSKILL{' '}
            <span
              style={{
                background: 'linear-gradient(135deg, #6D28D9 0%, #7C3AED 55%, #A78BFA 100%)',
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
                fontSize: '0.7rem',
                fontWeight: 500,
                color: 'var(--text-muted)',
                marginTop: '2px',
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
