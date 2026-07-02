'use client';

import { cn } from '@/lib/utils';
import {
  mapVerdictToDisplay,
  mapConfidenceToTier,
  extractPrimaryInsight,
  type OverallVerdict,
  type ConfidenceTier,
} from '@/lib/today-mapping';
import type { KeyFinding, TopAction } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// Confidence bar
// ─────────────────────────────────────────────────────────────────────────────

const CONFIDENCE_BARS: Record<ConfidenceTier, { filled: number; label: string }> = {
  high: { filled: 3, label: 'High confidence' },
  medium: { filled: 2, label: 'Medium confidence' },
  low: { filled: 1, label: 'Limited data' },
};

function ConfidenceBar({ tier }: { tier: ConfidenceTier }) {
  const { filled, label } = CONFIDENCE_BARS[tier];
  const isLow = tier === 'low';

  return (
    <span
      aria-label={label}
      className={cn('inline-flex items-center gap-1.5', isLow && 'opacity-60')}
      title={label}
    >
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            'h-2 w-1.5 rounded-full transition-opacity',
            i <= filled ? 'bg-current opacity-90' : 'bg-current opacity-20',
          )}
        />
      ))}
      {isLow && (
        <span className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
          Limited data
        </span>
      )}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Zone A — Verdict
// ─────────────────────────────────────────────────────────────────────────────

function getFreshnessLabel(hoursAgo: number): string {
  if (hoursAgo < 1) return 'Updated just now';
  if (hoursAgo === 1) return 'Updated 1 hour ago';
  if (hoursAgo <= 24) return `Updated ${hoursAgo} hours ago`;
  return "Based on yesterday's data";
}

interface VerdictZoneProps {
  verdict: OverallVerdict;
  confidence: number;
  keyFindings: KeyFinding[];
  topAction: TopAction | null;
  explanation: string;
  computedAt: string;
}

export function VerdictZone({
  verdict,
  confidence,
  keyFindings,
  topAction,
  explanation,
  computedAt,
}: VerdictZoneProps) {
  const display = mapVerdictToDisplay(verdict);
  const tier = mapConfidenceToTier(confidence);
  const insight = extractPrimaryInsight(topAction?.rationale, keyFindings[0]?.title, explanation);

  const updatedAt = new Date(computedAt);
  const hoursAgo = Math.round((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60));
  const isStale = hoursAgo > 24;
  const freshnessLabel = getFreshnessLabel(hoursAgo);

  return (
    <div
      className={cn(
        'rounded-2xl border bg-gradient-to-br to-transparent px-6 py-7',
        display.bgClass,
        isStale && 'opacity-80',
      )}
    >
      {/* Verdict label + confidence */}
      <div className="mb-4 flex items-center gap-3">
        <span className={cn('h-3 w-3 shrink-0 rounded-full', display.dotClass)} aria-hidden />
        <h1 className={cn('font-heading text-2xl font-bold tracking-tight', display.colorClass)}>
          {display.label}
        </h1>
        <span className={cn(display.colorClass)}>
          <ConfidenceBar tier={tier} />
        </span>
      </div>

      {/* Primary insight */}
      {insight && <p className="text-foreground/80 text-base leading-relaxed">{insight}</p>}

      {/* Freshness */}
      <p
        className={cn(
          'mt-4 text-xs',
          isStale ? 'font-medium text-amber-600 dark:text-amber-400' : 'text-muted-foreground',
        )}
      >
        {isStale ? '⚠ ' : ''}
        {freshnessLabel}
      </p>
    </div>
  );
}
