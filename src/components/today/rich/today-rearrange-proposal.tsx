'use client';

import Link from 'next/link';
import { ListRestart } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-presence';
import { RearrangeSessionRail } from '@/components/coach/plan/rearrange-session-rail';
import type { TodayViewModel } from '@/core/presentation/today-view-model';

/**
 * Plan vivant on Today — visual rearrange proposal (goal + session tension rail).
 * Deep-links to PlanAdapter; never applies silently.
 */
export function TodayRearrangeProposal({
  proposal,
}: {
  proposal: NonNullable<TodayViewModel['rearrangeProposal']>;
}) {
  return (
    <FadeIn>
      <section
        aria-label="Proposition de rearrange du plan"
        className="analysis-panel border-analysis-border/80 rounded-analysis-lg space-y-3 border px-3.5 py-3.5 sm:px-4 sm:py-4"
      >
        <div className="space-y-1">
          <p className="text-label">
            Plan vivant
            {proposal.goalLabel ? (
              <>
                {' · '}
                <span className="text-foreground/80 tracking-normal normal-case">
                  vers {proposal.goalLabel}
                </span>
              </>
            ) : null}
          </p>
          <p className="text-card-title text-pretty">{proposal.headline}</p>
          <p className="text-muted-foreground text-xs leading-relaxed text-pretty">
            {proposal.why}
          </p>
        </div>

        <RearrangeSessionRail
          ariaLabel="Séances à venir en tension"
          sessions={proposal.previewSessions}
        />

        <Link
          className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/15 pressable inline-flex min-h-11 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors duration-150 sm:min-h-0 sm:py-2"
          href={proposal.href}
        >
          <ListRestart className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
          {proposal.ctaLabel}
          <span aria-hidden>→</span>
        </Link>
      </section>
    </FadeIn>
  );
}
