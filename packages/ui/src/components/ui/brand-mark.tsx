import { useId } from 'react';

import { BRAND_MARK } from '@sharpit/app/lib/brand/brand-icon';

/** The app icon's mark — six dots on a hexagon in the icon's green — sized by `className`. */
export function BrandMark({ className }: { className?: string }) {
  const gradientId = useId();

  return (
    <svg className={className} viewBox={`0 0 ${BRAND_MARK.width} ${BRAND_MARK.height}`} aria-hidden>
      <defs>
        <linearGradient
          gradientUnits="userSpaceOnUse"
          id={gradientId}
          x1="0"
          x2="0"
          y1="0"
          y2={BRAND_MARK.height}
        >
          <stop offset="0" stopColor={BRAND_MARK.gradientTop} />
          <stop offset="1" stopColor={BRAND_MARK.gradientBottom} />
        </linearGradient>
      </defs>
      {BRAND_MARK.dots.map(([cx, cy]) => (
        <circle
          key={`${cx}-${cy}`}
          cx={cx}
          cy={cy}
          fill={`url(#${gradientId})`}
          r={BRAND_MARK.radius}
        />
      ))}
    </svg>
  );
}
