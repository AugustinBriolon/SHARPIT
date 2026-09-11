'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { DiscussWithCoachButton } from '@/components/coach/discuss/discuss-with-coach-button';
import { PlanSectionHeading } from '@/components/plan/hub/plan-section-heading';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import { useGoals } from '@/hooks/use-data';
import { MOI_CALIBRATION_PATH, MOI_OBJECTIFS_PATH } from '@/lib/moi/paths';
import {
  PLAN_COACH_INTENTION,
  PLAN_COACH_INTENTION_BLURB,
  PLAN_COACH_STEPS,
  resolvePlanCoachAccent,
  type PlanCoachStep,
  type PlanCoachStepId,
} from '@/lib/plan/hub/plan-coach-offer';
import type { CalibrationConfidence } from '@/lib/plan/trajectory/plan-calibration-confidence';
import { cn } from '@/lib/utils';

const STEP_BAND: Record<PlanCoachStepId, string> = {
  cadre: 'Cadre',
  remplir: 'Séances',
  ajuster: 'Ajuster',
};

const MacroPlanDialog = dynamic(
  () =>
    import('@/components/planning/overlays/macro-plan-dialog').then((mod) => mod.MacroPlanDialog),
  { ssr: false },
);

function CoachStepControl({
  accent,
  step,
  onCadre,
}: {
  accent: PlanCoachStepId | null;
  step: PlanCoachStep;
  onCadre: () => void;
}) {
  const emphasized = accent === step.id;
  const variant = emphasized ? 'default' : 'outline';

  if (step.id === 'cadre') {
    return (
      <Button
        aria-current={emphasized ? 'step' : undefined}
        className="w-full justify-start sm:w-auto"
        size="sm"
        type="button"
        variant={variant}
        onClick={onCadre}
      >
        {step.title}
      </Button>
    );
  }

  return (
    <LinkButton
      aria-current={emphasized ? 'step' : undefined}
      className="w-full justify-start sm:w-auto"
      href={step.href!}
      size="sm"
      variant={variant}
    >
      {step.title}
    </LinkButton>
  );
}

function CoachStepRow({
  accent,
  index,
  step,
  onCadre,
}: {
  accent: PlanCoachStepId | null;
  index: number;
  step: PlanCoachStep;
  onCadre: () => void;
}) {
  const emphasized = accent === step.id;

  return (
    <li
      className={cn(
        'analysis-panel-alt rounded-analysis-lg flex flex-col gap-2 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4',
        emphasized && 'border-foreground/25 border',
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <p className="text-muted-foreground text-label">
          {index + 1} · {STEP_BAND[step.id]}
        </p>
        <p className="text-muted-foreground text-xs leading-snug text-pretty">{step.role}</p>
      </div>
      <CoachStepControl accent={accent} step={step} onCadre={onCadre} />
    </li>
  );
}

function IntentionBlurb({ hasDatedGoal }: { hasDatedGoal: boolean }) {
  if (hasDatedGoal) {
    return (
      <p className="text-muted-foreground text-sm leading-snug text-pretty">
        {PLAN_COACH_INTENTION_BLURB}
      </p>
    );
  }

  return (
    <p className="text-muted-foreground text-sm leading-snug text-pretty">
      {PLAN_COACH_INTENTION_BLURB}{' '}
      <Link
        className="text-primary font-medium underline-offset-4 hover:underline"
        href={MOI_OBJECTIFS_PATH}
      >
        Définir un objectif
      </Link>
    </p>
  );
}

function CoachOfferSecondaryNav({ calibration }: { calibration: CalibrationConfidence | null }) {
  return (
    <nav aria-label="Suite du plan" className="flex flex-wrap items-center gap-2">
      {calibration ? (
        <LinkButton href={MOI_CALIBRATION_PATH} size="sm" variant="outline">
          Seuils et repères
        </LinkButton>
      ) : null}
      <DiscussWithCoachButton size="sm" target={{ kind: 'planning', horizonDays: 7 }} />
    </nav>
  );
}

/**
 * Hub coach offer: one intention, three ranked gestures (cadre → remplir → ajuster).
 * Bilan stays under Projection; Twin Adaptation is a drill-down, not a CTA here.
 */
export function PlanActions({
  calibration = null,
  hasActiveMacro = false,
  hasDatedGoal = false,
  hasRemainingSessions = false,
}: {
  calibration?: CalibrationConfidence | null;
  hasActiveMacro?: boolean;
  hasDatedGoal?: boolean;
  hasRemainingSessions?: boolean;
}) {
  const goalsQuery = useGoals();
  const [macroOpen, setMacroOpen] = useState(false);
  const accent = resolvePlanCoachAccent({
    hasDatedGoal,
    hasActiveMacro,
    hasRemainingSessions,
  });

  return (
    <>
      <section aria-labelledby="plan-coach-offer" className="space-y-3">
        <PlanSectionHeading heading="h2" id="plan-coach-offer" title={PLAN_COACH_INTENTION} />
        <IntentionBlurb hasDatedGoal={hasDatedGoal} />
        <ol className="space-y-2">
          {PLAN_COACH_STEPS.map((step, index) => (
            <CoachStepRow
              key={step.id}
              accent={accent}
              index={index}
              step={step}
              onCadre={() => setMacroOpen(true)}
            />
          ))}
        </ol>
        <CoachOfferSecondaryNav calibration={calibration} />
      </section>
      {macroOpen ? (
        <MacroPlanDialog goals={goalsQuery.data ?? []} onClose={() => setMacroOpen(false)} />
      ) : null}
    </>
  );
}
