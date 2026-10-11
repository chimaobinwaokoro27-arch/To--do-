import { useId } from 'react';

// The TaskFlow brand mark: a task card (rounded square) carrying a checkmark,
// wrapped by a subtle progress ring that reads as time/progress at larger sizes
// and softens away at 16px so the check stays crisp. The colours are fixed brand
// values rather than theme tokens, so the logo is identical in the favicon, on
// the auth screens and in the sidebar, in both light and dark mode.
function BrandLogo({ className = '', title = 'TaskFlow', decorative = false }) {
  // Unique, CSS-safe ids so several logos on one page never clash over their
  // gradients.
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const badgeId = `tfLogoBadge-${uid}`;
  const sheenId = `tfLogoSheen-${uid}`;

  return (
    <svg
      className={className}
      viewBox="0 0 64 64"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative ? 'true' : undefined}
      aria-label={decorative ? undefined : title}
      focusable="false"
    >
      {!decorative && <title>{title}</title>}

      <defs>
        <linearGradient id={badgeId} x1="6" y1="4" x2="58" y2="60" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#a855f7" />
          <stop offset="0.55" stopColor="#7c5cff" />
          <stop offset="1" stopColor="#2563eb" />
        </linearGradient>
        <linearGradient id={sheenId} x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="0.55" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>

      <rect width="64" height="64" rx="18" fill={`url(#${badgeId})`} />
      <rect width="64" height="64" rx="18" fill={`url(#${sheenId})`} />
      <path
        d="M52 32A20 20 0 1 1 32 12"
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.42"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d="M21 33l7.5 7L42.5 24"
        fill="none"
        stroke="#ffffff"
        strokeWidth="6.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default BrandLogo;
