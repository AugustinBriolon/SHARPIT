'use client';

import { ListRestart } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-presence';
import { Button } from '@/components/ui/button';
import { RearrangeSessionRail } from '@/components/coach/plan/rearrange-session-rail';
import type { PlanLivingCalloutView } from '@/lib/plan/hub/plan-living-callout';

/**
 * Hub Plan — elevates « Ajuster le planning » when Twin tension meets #92 accent.
 * Opens PlanAdapter in place (no 4th coach door).
 */
export function PlanLivingCallout({
  callout,
  onAdjust,
}: {
  callout: PlanLivingCalloutView;
  onAdjust: () => void;
}) {
  return (
    <FadeIn>
      <section
        aria-label="Plan vivant"
        className="analysis-panel border-analysis-border/80 rounded-analysis-lg space-y-3 border px-3.5 py-3.5 sm:px-4"
      >
        <div className="space-y-1">
          <p className="text-label">
            Plan vivant
            {callout.goalLabel ? (
              <>
                {' · '}
                <span className="text-foreground/80 tracking-normal normal-case">
                  {callout.goalLabel}
                </span>
              </>
            ) : null}
          </p>
          <p className="text-card-title text-pretty">{callout.headline}</p>
          <p className="text-muted-foreground text-xs leading-relaxed text-pretty">{callout.why}</p>
        </div>

        <RearrangeSessionRail
          ariaLabel="Séances restantes en tension"
          sessions={callout.previewSessions}
        />

        <Button className="w-fit" size="sm" type="button" variant="accent" onClick={onAdjust}>
          <ListRestart className="size-3.5" aria-hidden />
          {callout.ctaLabel}
        </Button>
      </section>
    </FadeIn>
  );
}
