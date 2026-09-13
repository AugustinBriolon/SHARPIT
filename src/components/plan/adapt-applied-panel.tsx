'use client';

import { Check } from 'lucide-react';
import { FadeIn } from '@/components/motion/fade-presence';
import { Button } from '@/components/ui/button';
import {
  PLAN_VIVANT_SHELL_CLASS,
  PlanVivantAdvancementSection,
  PlanVivantEyebrow,
} from '@/components/today/rich/goal-advancement-panel';
import {
  adaptAppliedHeadline,
  adaptAppliedWhy,
  type AdaptAppliedAck,
} from '@/lib/plan/adapt-applied-ack';
import type { GoalAdvancementView } from '@/lib/today/rich/goal-advancement';
import { cn } from '@/lib/utils';

function AdaptAppliedHeader({ ack }: { ack: AdaptAppliedAck }) {
  return (
    <div className="flex items-start gap-3">
      <span className="bg-highlight text-highlight-foreground mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
        <Check className="size-3.5" strokeWidth={2} aria-hidden />
      </span>
      <div className="min-w-0 space-y-1.5">
        <PlanVivantEyebrow />
        <p className="text-verdict text-ink-surface-foreground text-[1.5rem] leading-[1.15] text-pretty sm:text-[1.75rem]">
          {adaptAppliedHeadline(ack.goalLabel)}
        </p>
        <p className="text-ink-surface-foreground/70 text-xs leading-relaxed text-pretty">
          {adaptAppliedWhy(ack.changeCount)}
        </p>
      </div>
    </div>
  );
}

/** Confirmation after PlanAdapter apply — ink Plan vivant shell + Suivi absorbed. */
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
  return (
    <FadeIn>
      <section
        aria-label="Confirmation d’ajustement du plan"
        className={cn(PLAN_VIVANT_SHELL_CLASS, className)}
      >
        <AdaptAppliedHeader ack={ack} />
        {onDismiss ? (
          <Button
            className="border-ink-surface-foreground/30 text-ink-surface-foreground hover:bg-ink-surface-foreground/10 w-fit"
            size="sm"
            type="button"
            variant="outline"
            onClick={onDismiss}
          >
            {dismissLabel}
          </Button>
        ) : null}
        {advancement ? (
          <PlanVivantAdvancementSection prominence="secondary" view={advancement} showDivider />
        ) : null}
      </section>
    </FadeIn>
  );
}
