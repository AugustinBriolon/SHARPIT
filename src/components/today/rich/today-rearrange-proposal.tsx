'use client';

import Link from 'next/link';
import { ListRestart } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-presence';
import { RearrangeSessionRail } from '@/components/coach/plan/rearrange-session-rail';
import {
  PLAN_VIVANT_SHELL_CLASS,
  PlanVivantAdvancementSection,
  PlanVivantEyebrow,
} from '@/components/today/rich/goal-advancement-panel';
import {
  HABIT_SESSION_TENSION_CAPTION,
  habitLeverChipLabel,
} from '@/lib/today/rich/habit-coaching-signal';
import type { GoalAdvancementView } from '@/lib/today/rich/goal-advancement';
import type { TodayViewModel } from '@/core/presentation/today-view-model';

type RearrangeProposal = NonNullable<TodayViewModel['rearrangeProposal']>;

function RearrangeApplyLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="bg-highlight text-highlight-foreground hover:bg-highlight/90 pressable inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors duration-150 sm:w-auto sm:justify-start sm:py-2.5"
      href={href}
    >
      <ListRestart className="size-3.5 shrink-0" strokeWidth={1.8} aria-hidden />
      {label}
      <span aria-hidden>→</span>
    </Link>
  );
}

function RearrangeProposalHeader({
  habitDriven,
  proposal,
}: {
  habitDriven: boolean;
  proposal: RearrangeProposal;
}) {
  const lever = proposal.habitLever;
  return (
    <div className="space-y-2">
      <PlanVivantEyebrow habitDriven={habitDriven} />
      <p className="text-verdict text-ink-surface-foreground text-[1.5rem] leading-[1.15] text-pretty sm:text-[1.75rem]">
        {proposal.headline}
      </p>
      {proposal.goalLabel ? (
        <p className="text-ink-surface-foreground/65 text-xs leading-snug text-pretty">
          vers {proposal.goalLabel}
        </p>
      ) : null}
      <p className="text-ink-surface-foreground/70 text-xs leading-relaxed text-pretty">
        {proposal.why}
      </p>
      {lever ? (
        <p className="pt-0.5">
          <span className="border-ink-surface-foreground/30 text-ink-surface-foreground/75 inline-flex items-center rounded-md border px-2 py-1 text-[0.65rem] font-semibold tracking-wide uppercase">
            {habitLeverChipLabel(lever)}
          </span>
        </p>
      ) : null}
    </div>
  );
}

/**
 * Plan vivant on Today — rearrange + Suivi absorbed in one ink shell.
 */
export function TodayRearrangeProposal({
  proposal,
  advancement = null,
}: {
  proposal: RearrangeProposal;
  advancement?: GoalAdvancementView | null;
}) {
  const habitDriven = proposal.kind === 'habit';

  return (
    <FadeIn>
      <section aria-label="Proposition de rearrange du plan" className={PLAN_VIVANT_SHELL_CLASS}>
        <RearrangeProposalHeader habitDriven={habitDriven} proposal={proposal} />
        <RearrangeSessionRail
          caption={habitDriven ? HABIT_SESSION_TENSION_CAPTION : 'Séances en tension'}
          flow="sequence"
          sessions={proposal.previewSessions}
          ariaLabel={
            habitDriven
              ? 'Séances à venir en tension avec le journal'
              : 'Séances à venir en tension'
          }
          onInk
        />
        <RearrangeApplyLink href={proposal.href} label={proposal.ctaLabel} />
        {advancement ? (
          <PlanVivantAdvancementSection prominence="secondary" view={advancement} showDivider />
        ) : null}
      </section>
    </FadeIn>
  );
}
