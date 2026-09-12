'use client';

import Link from 'next/link';
import { ListRestart } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-presence';
import { RearrangeSessionRail } from '@/components/coach/plan/rearrange-session-rail';
import { habitLeverChipLabel } from '@/lib/today/rich/habit-coaching-signal';
import type { TodayViewModel } from '@/core/presentation/today-view-model';

type RearrangeProposal = NonNullable<TodayViewModel['rearrangeProposal']>;

function PlanVivantEyebrow({
  habitDriven,
  goalLabel,
}: {
  habitDriven: boolean;
  goalLabel: string | null;
}) {
  return (
    <p className="text-label">
      Plan vivant
      {habitDriven ? (
        <>
          {' · '}
          <span className="text-foreground/80 tracking-normal normal-case">Journal</span>
        </>
      ) : null}
      {goalLabel ? (
        <>
          {' · '}
          <span className="text-foreground/80 tracking-normal normal-case">vers {goalLabel}</span>
        </>
      ) : null}
    </p>
  );
}

/**
 * Plan vivant on Today — visual rearrange proposal (goal + session tension rail).
 * Deep-links to PlanAdapter; never applies silently.
 * Habit lever chip when journal drives or annotates the same CTA.
 */
export function TodayRearrangeProposal({ proposal }: { proposal: RearrangeProposal }) {
  const habitDriven = proposal.kind === 'habit';
  const lever = proposal.habitLever;

  return (
    <FadeIn>
      <section
        aria-label="Proposition de rearrange du plan"
        className="analysis-panel border-analysis-border/80 rounded-analysis-lg space-y-3 border px-3.5 py-3.5 sm:px-4 sm:py-4"
      >
        <div className="space-y-1">
          <PlanVivantEyebrow goalLabel={proposal.goalLabel} habitDriven={habitDriven} />
          <p className="text-card-title text-pretty">{proposal.headline}</p>
          <p className="text-muted-foreground text-xs leading-relaxed text-pretty">
            {proposal.why}
          </p>
          {lever ? (
            <p className="pt-0.5">
              <span className="border-analysis-border/80 bg-background/70 text-muted-foreground inline-flex items-center rounded-md border px-2 py-1 text-[0.65rem] font-semibold tracking-wide uppercase">
                {habitLeverChipLabel(lever)}
              </span>
            </p>
          ) : null}
        </div>

        <RearrangeSessionRail
          caption={habitDriven ? 'Tension habit → séances' : undefined}
          sessions={proposal.previewSessions}
          ariaLabel={
            habitDriven
              ? 'Séances à venir en tension avec le journal'
              : 'Séances à venir en tension'
          }
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
