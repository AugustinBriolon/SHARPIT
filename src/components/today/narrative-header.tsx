'use client';

import type { TopAction } from '@/hooks/use-today';
import { resolveCode } from '@/lib/french';
import {
  mapConfidenceToTier,
  mapVerdictToDisplay,
  type ConfidenceTier,
  type OverallVerdict,
} from '@/lib/today-mapping';
import { cn } from '@/lib/utils';

const CONFIDENCE_BARS: Record<ConfidenceTier, { filled: number; label: string }> = {
  high: { filled: 3, label: 'Confiance élevée' },
  medium: { filled: 2, label: 'Confiance moyenne' },
  low: { filled: 1, label: 'Données limitées' },
};

function ConfidenceIndicator({ tier }: { tier: ConfidenceTier }) {
  const { filled, label } = CONFIDENCE_BARS[tier];

  return (
    <span
      aria-label={label}
      className="inline-flex items-center gap-1.5"
      title={`Fiabilité de l'analyse : ${label.toLowerCase()}`}
    >
      <span className="inline-flex items-center gap-0.5" aria-hidden>
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              'h-2 w-1.5 rounded-full bg-current transition-opacity',
              i <= filled ? 'opacity-90' : 'opacity-20',
            )}
          />
        ))}
      </span>
      <span className="text-[10px] font-medium opacity-75">{label}</span>
    </span>
  );
}

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
  const rationale = resolveCode(topAction.rationaleCode);

  const updatedAt = new Date(computedAt);
  const hoursAgo = Math.round((Date.now() - updatedAt.getTime()) / (1000 * 60 * 60));
  const isStale = hoursAgo > 24;
  const freshnessLabel = getFreshnessLabel(hoursAgo);

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl border bg-linear-to-br to-transparent px-6 py-7',
        isStale && 'opacity-80',
      )}
    >
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className={cn('text-xs font-semibold tracking-widest uppercase', display.colorClass)}>
          {display.label}
        </span>
        <span className={cn(display.colorClass)}>
          <ConfidenceIndicator tier={tier} />
        </span>
      </div>

      <p className="font-heading text-foreground text-[1.65rem] leading-tight font-bold">
        {rationale}
      </p>

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
