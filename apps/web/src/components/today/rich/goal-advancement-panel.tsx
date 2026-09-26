'use client';

import { FadeIn } from '@/components/motion/fade-presence';
import { PlanVivantBand } from '@/components/today/rich/plan-vivant-band';
import {
  planVivantProgress,
  planVivantReading,
} from '@sharpit/server/lib/today/rich/plan-vivant-reading';
import type { GoalAdvancementView } from '@sharpit/server/lib/today/rich/goal-advancement';
import { cn } from '@sharpit/server/lib/utils';

function weekStatusLine(view: GoalAdvancementView): string | null {
  if (view.weekSegments.length === 0) {
    return null;
  }
  return view.weekSegments
    .map((segment) => `${segment.dateLabel} ${segment.intensityLabel}`)
    .join(' · ');
}

/** Plan hub lab-note — one muted line under the destination plate. */
function AdvancementNote({ view, className }: { view: GoalAdvancementView; className?: string }) {
  const weekLine = weekStatusLine(view);

  return (
    <p className={cn('text-muted-foreground text-[11px] leading-snug text-pretty', className)}>
      <span className="text-foreground font-medium">{view.headline}</span>
      {weekLine ? ` · ${weekLine}` : null}
      {view.phaseLabel ? ` · ${view.phaseLabel}` : null}
    </p>
  );
}

/**
 * Suivi Plan vivant on Résumé — a band, not a card.
 *
 * Résumé is read in one pass in the morning. The week and the countdown fit on
 * one line; the day-by-day detail lives on /plan/semaine, which the band opens.
 */
export function GoalAdvancementPanel({
  view,
  className,
  density = 'panel',
}: {
  view: GoalAdvancementView;
  className?: string;
  density?: 'panel' | 'note';
}) {
  if (density === 'note') {
    return <AdvancementNote className={className} view={view} />;
  }

  return (
    <FadeIn>
      <PlanVivantBand
        actionLabel={view.ctaLabel}
        ariaLabel={`${view.ctaLabel} — Plan vivant`}
        className={className}
        href={view.href}
        progress={planVivantProgress({ progress: view.progress, phases: view.phases })}
        reading={planVivantReading({
          goalLabel: view.goalLabel,
          headline: view.headline,
          progress: view.progress,
          segments: view.weekSegments,
          emptyWeekClause: 'aucune séance cette semaine',
        })}
      />
    </FadeIn>
  );
}

/** Compact one-liner for the applied-confirmation card on the Plan hub. */
export function planVivantCompactStatus(view: GoalAdvancementView): string {
  const parts = [view.headline];
  const weekLine = weekStatusLine(view);
  if (weekLine) {
    parts.push(weekLine);
  }
  return parts.join(' · ');
}
