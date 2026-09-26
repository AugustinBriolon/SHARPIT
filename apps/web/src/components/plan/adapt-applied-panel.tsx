'use client';

import { FadeIn } from '@/components/motion/fade-presence';
import { PlanVivantBand } from '@/components/today/rich/plan-vivant-band';
import {
  planVivantProgress,
  planVivantReading,
} from '@sharpit/app/lib/today/rich/plan-vivant-reading';
import {
  adaptAppliedHeadline,
  adaptAppliedWhy,
  type AdaptAppliedAck,
} from '@sharpit/app/lib/plan/adapt-applied-ack';
import type { GoalAdvancementView } from '@sharpit/app/lib/today/rich/goal-advancement';

/** The week reading once suivi is loaded, else the goal the ack names. */
function appliedReading(
  ack: AdaptAppliedAck,
  advancement: GoalAdvancementView | null,
): string | null {
  if (advancement) {
    return planVivantReading({
      goalLabel: advancement.goalLabel,
      headline: advancement.headline,
      progress: advancement.progress,
      segments: advancement.weekSegments,
      emptyWeekClause: 'aucune séance cette semaine',
    });
  }
  return ack.goalLabel ? `vers ${ack.goalLabel}` : null;
}

/** Dismiss when the caller owns the surface, otherwise walk to the goal. */
function appliedAction(
  onDismiss: (() => void) | undefined,
  dismissLabel: string,
  advancement: GoalAdvancementView | null,
): { actionLabel: string; href: string | null } {
  if (onDismiss) {
    return { actionLabel: dismissLabel, href: null };
  }
  return {
    actionLabel: advancement?.ctaLabel ?? 'Voir le plan',
    href: advancement?.href ?? '/plan',
  };
}

/**
 * Confirmation after PlanAdapter apply — the same band as every other Plan
 * vivant state. One object followed across three surfaces has to keep one
 * shape, or the athlete cannot tell it is the same thing.
 */
export function PlanAdaptAppliedPanel({
  ack,
  className,
  onDismiss,
  dismissLabel = 'Fermer',
  advancement = null,
}: {
  ack: AdaptAppliedAck;
  className?: string;
  onDismiss?: () => void;
  dismissLabel?: string;
  advancement?: GoalAdvancementView | null;
}) {
  const progress = advancement
    ? planVivantProgress({ progress: advancement.progress, phases: advancement.phases })
    : null;
  const action = appliedAction(onDismiss, dismissLabel, advancement);

  return (
    <FadeIn>
      <PlanVivantBand
        actionLabel={action.actionLabel}
        ariaLabel="Confirmation d’ajustement du plan"
        className={className}
        href={action.href}
        note={`${adaptAppliedHeadline(ack.goalLabel)} · ${adaptAppliedWhy(ack.changeCount)}`}
        progress={progress}
        reading={appliedReading(ack, advancement)}
        tone="done"
        onAction={onDismiss}
      />
    </FadeIn>
  );
}
