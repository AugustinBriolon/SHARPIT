'use client';

import Link from 'next/link';
import { cn } from '@/lib/utils';
import { mapScoreToColorClass } from '@/lib/today-mapping';

// ─────────────────────────────────────────────────────────────────────────────
// ArcGauge — SVG 270° arc gauge, score 0–100
// ─────────────────────────────────────────────────────────────────────────────

function arcStrokeColor(score: number | null): string {
  if (score === null) return '#94a3b8';
  if (score >= 80) return '#10b981';
  if (score >= 60) return '#3b82f6';
  if (score >= 40) return '#f59e0b';
  return '#ef4444';
}

export function ArcGauge({
  score,
  label,
  href,
  size = 72,
  strokeWidth = 5,
  invertColor = false,
  strokeColor,
  children,
}: {
  score: number | null;
  label?: string;
  href?: string;
  size?: number;
  strokeWidth?: number;
  /** When true, a high score is bad (fatigue). Color logic uses 100 - score. */
  invertColor?: boolean;
  /** Override arc stroke color (e.g. restorative ratio uses different thresholds). */
  strokeColor?: string;
  children?: React.ReactNode;
}) {
  const displayScore = invertColor && score !== null ? 100 - score : score;
  const pct = score ?? 0;
  const r = size * 0.35;
  const circ = 2 * Math.PI * r;
  const arcLen = circ * 0.75;
  const filled = arcLen * (pct / 100);
  const gap = arcLen - filled;
  const cx = size / 2;
  const cy = size / 2;

  const resolvedStrokeColor = strokeColor ?? arcStrokeColor(displayScore);
  const colorClass = mapScoreToColorClass(displayScore);

  function fontSize() {
    if (size >= 88) return 'text-2xl';
    if (size >= 64) return 'text-lg';
    if (size >= 48) return 'text-sm';
    return 'text-xs';
  }

  const center = children ?? (
    <span className={cn('leading-none font-bold tabular-nums', fontSize(), colorClass)}>
      {score !== null ? score : '—'}
    </span>
  );

  const content = (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg height={size} viewBox={`0 0 ${size} ${size}`} width={size} aria-hidden>
          <circle
            cx={cx}
            cy={cy}
            fill="none"
            r={r}
            stroke="currentColor"
            strokeDasharray={`${arcLen} ${circ - arcLen}`}
            strokeLinecap="round"
            strokeOpacity={0.1}
            strokeWidth={strokeWidth}
            transform={`rotate(135 ${cx} ${cy})`}
          />
          <circle
            cx={cx}
            cy={cy}
            fill="none"
            r={r}
            stroke={resolvedStrokeColor}
            strokeDasharray={`${filled} ${gap + (circ - arcLen)}`}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            transform={`rotate(135 ${cx} ${cy})`}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">{center}</div>
      </div>
      {label && (
        <span className="text-center text-[10px] font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
    </div>
  );

  if (href) {
    return (
      <Link className="transition-opacity hover:opacity-80" href={href}>
        {content}
      </Link>
    );
  }
  return content;
}
