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

/**
 * Visual confirmation after athlete-validated PlanAdapter apply.
 * Anchored on goal — never a silent toast-only close.
 * Suivi section absorbed when present (one Plan vivant shell).
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
  return (
    <FadeIn>
      <section
        aria-label="Confirmation d’ajustement du plan"
        className={cn(PLAN_VIVANT_SHELL_CLASS, 'border-primary/35 bg-primary/5', className)}
      >
        <div className="flex items-start gap-3">
          <span className="bg-primary/15 text-primary mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg">
            <Check className="size-3.5" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0 space-y-1.5">
            <PlanVivantEyebrow />
            <p className="text-verdict text-pretty">{adaptAppliedHeadline(ack.goalLabel)}</p>
            <p className="text-muted-foreground text-xs leading-relaxed text-pretty">
              {adaptAppliedWhy(ack.changeCount)}
            </p>
          </div>
        </div>
        {onDismiss ? (
          <Button className="w-fit" size="sm" type="button" variant="outline" onClick={onDismiss}>
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
