'use client';

import { ListRestart } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-presence';
import { Button } from '@/components/ui/button';
import { RearrangeSessionRail } from '@/components/coach/plan/rearrange-session-rail';
import {
  HABIT_SESSION_TENSION_CAPTION,
  habitLeverChipLabel,
} from '@/lib/today/rich/habit-coaching-signal';
import type { PlanLivingCalloutView } from '@/lib/plan/hub/plan-living-callout';

function LivingEyebrow({
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
          <span className="text-foreground/80 tracking-normal normal-case">{goalLabel}</span>
        </>
      ) : null}
    </p>
  );
}

/**
 * Hub Plan — elevates « Ajuster le planning » when Twin or journal habit
 * tension meets #92 accent. Opens PlanAdapter in place (no 4th coach door).
 */
export function PlanLivingCallout({
  callout,
  onAdjust,
}: {
  callout: PlanLivingCalloutView;
  onAdjust: () => void;
}) {
  const habitDriven = callout.kind === 'habit';
  const lever = callout.habitLever;

  return (
    <FadeIn>
      <section
        aria-label="Plan vivant"
        className="analysis-panel border-analysis-border/80 rounded-analysis-lg space-y-3 border px-3.5 py-3.5 sm:px-4"
      >
        <div className="space-y-1">
          <LivingEyebrow goalLabel={callout.goalLabel} habitDriven={habitDriven} />
          <p className="text-card-title text-pretty">{callout.headline}</p>
          <p className="text-muted-foreground text-xs leading-relaxed text-pretty">{callout.why}</p>
          {lever ? (
            <p className="pt-0.5">
              <span className="border-analysis-border/80 bg-background/70 text-muted-foreground inline-flex items-center rounded-md border px-2 py-1 text-[0.65rem] font-semibold tracking-wide uppercase">
                {habitLeverChipLabel(lever)}
              </span>
            </p>
          ) : null}
        </div>

        <RearrangeSessionRail
          caption={habitDriven ? HABIT_SESSION_TENSION_CAPTION : undefined}
          sessions={callout.previewSessions}
          ariaLabel={
            habitDriven
              ? 'Séances restantes en tension avec le journal'
              : 'Séances restantes en tension'
          }
        />

        <Button className="w-fit" size="sm" type="button" variant="accent" onClick={onAdjust}>
          <ListRestart className="size-3.5" aria-hidden />
          {callout.ctaLabel}
        </Button>
      </section>
    </FadeIn>
  );
}
