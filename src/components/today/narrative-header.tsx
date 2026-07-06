'use client';

import type { TopAction } from '@/hooks/use-today';
import { resolveCode } from '@/lib/french';
import { mapVerdictToDisplay, type OverallVerdict } from '@/lib/today-mapping';
import { cn } from '@/lib/utils';

interface NarrativeHeaderProps {
  verdict: OverallVerdict;
  topAction: TopAction;
  computedAt: string;
  className?: string;
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
  computedAt,
  className,
}: NarrativeHeaderProps) {
  const display = mapVerdictToDisplay(verdict);
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
        className,
      )}
    >
      <div className="mb-3">
        <span className={cn('text-xs font-semibold tracking-widest uppercase', display.colorClass)}>
          {display.label}
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
