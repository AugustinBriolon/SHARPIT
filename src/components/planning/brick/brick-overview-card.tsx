'use client';

import { useState } from 'react';
import { Check, ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';
import { BrickAnalysisPanel } from '@/components/planning/brick/brick-analysis-panel';
import { activityTypeLabels } from '@/lib/format';
import { formatPlannedDuration, intensityLabels } from '@/lib/planned-session/sessions';
import type { BrickLegSummary } from '@/lib/planned-session/brick/brick-sessions';
import { cn } from '@/lib/utils';

/**
 * One brick, one bubble.
 *
 * A brick is a single prescription across sports — showing it as a list of
 * unrelated rows (or sending the athlete into one leg's dialog) hid the
 * enchaînement that is the point of planning it as a brick. This collapses to
 * one card; a dropdown reveals each leg, and opening a leg still lands on its
 * own dialog for the sport-specific detail and edit.
 */
export function BrickOverviewCard({
  legs,
  brickGroupId,
  subtitle,
  badge,
  defaultExpanded = false,
  onOpenLeg,
}: {
  legs: BrickLegSummary[];
  brickGroupId: string;
  subtitle?: string | null;
  /** Small pill next to the title — e.g. "Point de bascule". */
  badge?: string | null;
  defaultExpanded?: boolean;
  onOpenLeg: (legId: string) => void;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const allDone = legs.length > 0 && legs.every((leg) => leg.completed);
  const sequence = legs.map((leg) => activityTypeLabels[leg.type]).join(' → ');

  return (
    <div className="chip-surface-lg rounded-analysis-lg overflow-hidden">
      <button
        aria-expanded={expanded}
        className="focus-visible:ring-primary/35 flex w-full items-center gap-2.5 px-3 py-3 text-left focus-visible:ring-2 focus-visible:outline-hidden"
        type="button"
        onClick={() => setExpanded((v) => !v)}
      >
        <Layers className="text-primary size-4 shrink-0" aria-hidden />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="text-foreground truncate text-sm font-medium">
              Brick · {sequence}
            </span>
            {badge ? (
              <span className="border-primary/40 text-primary text-data w-fit shrink-0 rounded-full border px-2 py-0.5 text-[10px]">
                {badge}
              </span>
            ) : null}
          </span>
          {subtitle ? (
            <span className="text-muted-foreground truncate text-xs">{subtitle}</span>
          ) : null}
        </span>
        {allDone ? <Check className="text-primary size-4 shrink-0" aria-hidden /> : null}
        <ChevronDown
          className={cn(
            'text-muted-foreground/70 size-4 shrink-0 transition-transform duration-150',
            expanded && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      {expanded ? (
        <div className="border-analysis-border/60 divide-analysis-border/60 divide-y border-t">
          {legs.map((leg) => (
            <button
              key={leg.id}
              className="hover:bg-primary/5 focus-visible:ring-primary/35 flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors focus-visible:ring-2 focus-visible:outline-hidden focus-visible:ring-inset"
              type="button"
              onClick={() => onOpenLeg(leg.id)}
            >
              <ActivityTypeIndicator type={leg.type} variant="code" />
              <span className="min-w-0 flex-1">
                <span className="text-foreground block truncate text-sm">{leg.title}</span>
                <span className="text-muted-foreground flex flex-wrap items-center gap-x-1.5 text-xs">
                  {leg.durationMin != null ? (
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
              <ChevronRight className="text-muted-foreground/50 size-4 shrink-0" aria-hidden />
            </button>
          ))}
          <div className="px-3 py-2.5">
            <BrickAnalysisPanel brickGroupId={brickGroupId} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
