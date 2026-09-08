'use client';

import { Check, Layers } from 'lucide-react';
import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { activityTypeLabels } from '@/lib/format';
import { formatPlannedDuration, intensityLabels } from '@/lib/planned-session/sessions';
import type { BrickLegSummary } from '@/lib/planned-session/brick/brick-sessions';
import { cn } from '@/lib/utils';
import { NavArrowRight } from '@/components/icons/nav-arrows';

/**
 * One brick, one surface — legs always visible (no disclosure).
 * Opening a leg lands on its planned-session dialog.
 */
export function BrickOverviewCard({
  legs,
  subtitle,
  badge,
  primary = false,
  onOpenLeg,
}: {
  legs: BrickLegSummary[];
  subtitle?: string | null;
  /** Small pill next to the title — e.g. "Point de bascule". */
  badge?: string | null;
  /** Highlights the brick when it is the next owed block of the day. */
  primary?: boolean;
  onOpenLeg: (legId: string) => void;
}) {
  const allDone = legs.length > 0 && legs.every((leg) => leg.completed);
  const sequence = legs.map((leg) => activityTypeLabels[leg.type]).join(' → ');

  return (
    <div
      className={cn(
        'chip-surface-lg rounded-analysis-lg overflow-hidden',
        primary && 'ring-primary/25 ring-1',
      )}
    >
      <div className="flex items-center gap-2.5 px-3 py-3">
        <Layers className="text-primary size-4 shrink-0" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-foreground truncate text-sm font-medium">Brick · {sequence}</span>
            {badge ? (
              <span className="border-primary/40 text-primary text-data w-fit shrink-0 rounded-full border px-2 py-0.5 text-[10px]">
                {badge}
              </span>
            ) : null}
            {primary ? (
              <span className="bg-highlight text-highlight-foreground text-data rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide uppercase">
                Prioritaire
              </span>
            ) : null}
          </span>
          {subtitle ? (
            <span className="text-muted-foreground truncate text-xs">{subtitle}</span>
          ) : null}
        </span>
        {allDone ? <Check className="text-primary size-4 shrink-0" aria-hidden /> : null}
      </div>

      <ul className="border-analysis-border/40 divide-analysis-border/40 divide-y border-t">
        {legs.map((leg) => (
          <li key={leg.id}>
            <button
              className="hover:bg-primary/5 focus-visible:ring-primary/35 flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset"
              type="button"
              onClick={() => onOpenLeg(leg.id)}
            >
              <ActivityTypeIndicator type={leg.type} variant="code" />
              <span className="min-w-0 flex-1">
                <span className="text-foreground block truncate text-sm">{leg.title}</span>
                <span className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs">
                  {leg.durationMin !== null ? (
                    <span className="tabular-nums">{formatPlannedDuration(leg.durationMin)}</span>
                  ) : null}
                  {leg.intensity ? (
                    <>
                      <span className="opacity-30" aria-hidden>
                        ·
                      </span>
                      <span>{intensityLabels[leg.intensity]}</span>
                    </>
                  ) : null}
                  {leg.completed ? (
                    <>
                      <span className="opacity-30" aria-hidden>
                        ·
                      </span>
                      <span className="text-primary inline-flex items-center gap-0.5">
                        <Check className="size-3" aria-hidden />
                        Réalisée
                      </span>
                    </>
                  ) : null}
                </span>
              </span>
              <NavArrowRight className="text-muted-foreground/50 size-4 shrink-0" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
