'use client';

import { FadeIn } from '@/components/motion/fade-presence';
import { RearrangeSessionRail } from '@/components/coach/plan/rearrange-session-rail';
import { PlanVivantBand } from '@/components/today/rich/plan-vivant-band';
import {
  HABIT_SESSION_TENSION_CAPTION,
  habitLeverChipLabel,
} from '@/lib/today/rich/habit-coaching-signal';
import type { PlanLivingCalloutView } from '@/lib/plan/hub/plan-living-callout';

/**
 * Hub Plan — Plan vivant tension. The same band as Today, so the athlete reads
 * one object across surfaces rather than three unrelated shapes.
 * Opens PlanAdapter in place (no 4th coach door). Never Verdict ink.
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
  const reading = [
    callout.goalLabel ? `vers ${callout.goalLabel}` : null,
    habitDriven ? 'Journal' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <FadeIn>
      <div className="space-y-2">
        <PlanVivantBand
          actionLabel={callout.ctaLabel}
          ariaLabel="Proposition d’ajustement du plan"
          note={callout.headline}
          reading={reading || null}
          tone="tension"
          onAction={onAdjust}
        />

        <p className="text-muted-foreground text-[13px] leading-snug text-pretty">{callout.why}</p>

        {lever ? (
          <p className="text-muted-foreground text-meta font-medium tracking-wide uppercase">
            {habitLeverChipLabel(lever)}
          </p>
        ) : null}

        <RearrangeSessionRail
          caption={habitDriven ? HABIT_SESSION_TENSION_CAPTION : undefined}
          sessions={callout.previewSessions}
          ariaLabel={
            habitDriven
              ? 'Séances restantes en tension avec le journal'
              : 'Séances restantes en tension'
          }
        />
      </div>
    </FadeIn>
  );
}
