'use client';

import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ONBOARDING_STEP_COUNT,
  onboardingProgressLabel,
  onboardingProgressPercent,
  onboardingSegmentTicks,
  onboardingStepPosition,
} from '@/lib/onboarding/wizard-progress';
import {
  ONBOARDING_STEP_LABELS,
  previousOnboardingStep,
  type OnboardingWizardStep,
} from '@/lib/onboarding/wizard-steps';

/**
 * Wizard wayfinding: one continuous rail that extends as the athlete advances,
 * with hairline ticks so the remaining steps stay countable.
 *
 * From step 2 onward the meta row is a back control labelled with the *previous*
 * step (arrow + "Sports"), not the current page title — so the athlete always
 * knows where going back lands.
 * CSS-only width transition per ADR-028 — reduced motion is neutralised globally.
 */
export function OnboardingProgress({
  step,
  onBack,
  backDisabled = false,
}: {
  step: OnboardingWizardStep;
  onBack?: () => void;
  backDisabled?: boolean;
}) {
  const previous = step === 'bootstrap' ? null : previousOnboardingStep(step);
  const previousLabel = previous ? ONBOARDING_STEP_LABELS[previous] : null;
  const currentLabel = ONBOARDING_STEP_LABELS[step === 'bootstrap' ? 'providers' : step];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        {onBack && previousLabel ? (
          <Button
            aria-label={`Revenir à ${previousLabel}`}
            className="-my-2 -ml-2.5 gap-1 px-2"
            disabled={backDisabled}
            type="button"
            variant="ghost"
            onClick={onBack}
          >
            <ChevronLeft className="size-4 shrink-0" aria-hidden />
            <span className="truncate text-sm font-medium">{previousLabel}</span>
          </Button>
        ) : (
          <p className="text-foreground truncate text-sm font-medium">{currentLabel}</p>
        )}
        <p className="text-muted-foreground font-data text-xs tabular-nums">
          {onboardingStepPosition(step)}/{ONBOARDING_STEP_COUNT}
        </p>
      </div>

      <ProgressRail step={step} />
    </div>
  );
}

function ProgressRail({ step }: { step: OnboardingWizardStep }) {
  return (
    <div
      aria-valuemax={ONBOARDING_STEP_COUNT}
      aria-valuemin={0}
      aria-valuenow={onboardingStepPosition(step)}
      aria-valuetext={onboardingProgressLabel(step)}
      className="bg-border/70 relative h-1 w-full overflow-hidden rounded-full"
      role="progressbar"
    >
      <div
        className="bg-primary absolute inset-y-0 left-0 rounded-full transition-[width] duration-300 ease-out"
        style={{ width: `${onboardingProgressPercent(step)}%` }}
      />
      {onboardingSegmentTicks().map((tick) => (
        <span
          key={tick}
          className="bg-background absolute inset-y-0 w-0.5"
          style={{ left: `${tick}%` }}
          aria-hidden
        />
      ))}
    </div>
  );
}
