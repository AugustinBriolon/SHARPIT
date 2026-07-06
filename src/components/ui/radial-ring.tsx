import { RADIAL_TRACK_COLOR } from '@/lib/radial-gauge';

export function RadialRing({
  fillPercent,
  size,
  strokeWidth,
  strokeColor,
  trackColor = RADIAL_TRACK_COLOR,
}: {
  fillPercent: number;
  size: number;
  strokeWidth: number;
  strokeColor: string;
  trackColor?: string;
}) {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75;
  const filled = arcLen * (fillPercent / 100);
  const gap = arcLen - filled;
  const cx = size / 2;
  const cy = size / 2;

  return (
    <svg height={size} viewBox={`0 0 ${size} ${size}`} width={size} aria-hidden>
      <circle
        cx={cx}
        cy={cy}
        fill="none"
        r={r}
        stroke={trackColor}
        strokeDasharray={`${arcLen} ${circ - arcLen}`}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        transform={`rotate(135 ${cx} ${cy})`}
      />
      <circle
        cx={cx}
        cy={cy}
        fill="none"
        r={r}
        stroke={strokeColor}
        strokeDasharray={`${filled} ${gap + (circ - arcLen)}`}
        strokeLinecap="round"
        strokeWidth={strokeWidth}
        transform={`rotate(135 ${cx} ${cy})`}
      />
    </svg>
  );
}
