'use client';

import { cn } from '@/lib/utils';
import {
  mapVerdictToDisplay,
  mapConfidenceToTier,
  type OverallVerdict,
  type ConfidenceTier,
} from '@/lib/today-mapping';
import { resolveCode } from '@/lib/french';
import type { TopAction } from '@/hooks/use-today';

// ─────────────────────────────────────────────────────────────────────────────
// Confidence bar (extracted from old verdict-zone)
// ─────────────────────────────────────────────────────────────────────────────

const CONFIDENCE_BARS: Record<ConfidenceTier, { filled: number; label: string }> = {
  high: { filled: 3, label: 'Confiance élevée' },
  medium: { filled: 2, label: 'Confiance moyenne' },
  low: { filled: 1, label: 'Données limitées' },
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
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NarrativeHeader — Q1: What should I do today?
// ─────────────────────────────────────────────────────────────────────────────

interface NarrativeHeaderProps {
  verdict: OverallVerdict;
  topAction: TopAction;
  confidence: number;
  computedAt: string;
}

function getFreshnessLabel(hoursAgo: number): string {
  if (hoursAgo < 1) return "Mis à jour à l'instant";
  if (hoursAgo === 1) return 'Mis à jour il y a 1 heure';
  if (hoursAgo <= 24) return `Mis à jour il y a ${hoursAgo} heures`;
  return "Basé sur les données d'hier";
}

export function NarrativeHeader({
  verdict,
  topAction,
  confidence,
  computedAt,
}: NarrativeHeaderProps) {
  const display = mapVerdictToDisplay(verdict);
  const tier = mapConfidenceToTier(confidence);

  const updatedAt = new Date(computedAt);
  const hoursAgo = Math.round((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60));
  const isStale = hoursAgo > 24;
  const freshnessLabel = getFreshnessLabel(hoursAgo);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-linear-to-br to-transparent px-6 py-7',
        display.bgClass,
        isStale && 'opacity-80',
      )}
    >
      {/* Verdict badge */}
      <div className="mb-3 flex items-center gap-2">
        <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', display.dotClass)} aria-hidden />
        <span className={cn('text-xs font-semibold tracking-widest uppercase', display.colorClass)}>
          {display.label}
        </span>
        <span className={cn('ml-1', display.colorClass)}>
          <ConfidenceBar tier={tier} />
        </span>
      </div>

      {/* Hero action — the answer to Q1 */}
      <p className="font-heading text-[1.65rem] leading-tight font-bold tracking-tight">
        <span className="text-foreground/50 font-normal">{resolveCode(topAction.verbCode)} </span>
        {resolveCode(topAction.focusCode)}
      </p>

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
