'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { FadeIn } from '@/components/motion/fade-presence';
import { PlanVivantBand } from '@/components/today/rich/plan-vivant-band';
import {
  planVivantProgress,
  planVivantReading,
} from '@sharpit/app/lib/today/rich/plan-vivant-reading';
import type { GoalAdvancementView } from '@sharpit/app/lib/today/rich/goal-advancement';
import type { TodayViewModel } from '@sharpit/app/presentation/today-view-model';

const PlanAdapter = dynamic(
  () => import('@/components/coach/plan/plan-adapter').then((mod) => mod.PlanAdapter),
  { ssr: false },
);

type RearrangeProposal = NonNullable<TodayViewModel['rearrangeProposal']>;

/** The week reading when suivi is loaded, else the goal the proposal serves. */
function bandReading(
  proposal: RearrangeProposal,
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
  return proposal.goalLabel ? `vers ${proposal.goalLabel}` : null;
}

/**
 * Plan vivant — tension. Instrument chrome + session strip + pressable footer CTA.
 * Opens PlanAdapter in place (no route-hop).
 */
export function TodayRearrangeProposal({
  proposal,
  advancement = null,
}: {
  proposal: RearrangeProposal;
  advancement?: GoalAdvancementView | null;
}) {
  const [adapterOpen, setAdapterOpen] = useState(false);

  return (
    <FadeIn>
      <PlanVivantBand
        actionLabel={proposal.ctaLabel}
        ariaLabel="Proposition d’ajustement du plan"
        note={proposal.headline}
        reading={bandReading(proposal, advancement)}
        tone="tension"
        progress={
          advancement
            ? planVivantProgress({ progress: advancement.progress, phases: advancement.phases })
            : null
        }
        onAction={() => setAdapterOpen(true)}
      />

      {adapterOpen ? (
        <PlanAdapter initialFocus={proposal.focus} onClose={() => setAdapterOpen(false)} />
      ) : null}
    </FadeIn>
  );
}
