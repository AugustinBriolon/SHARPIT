'use client';

import { useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { PlanLivingCallout } from '@/components/plan/hub/plan-living-callout';
import { usePlanHubModel } from '@/hooks/use-plan-hub-model';
import { buildPlanLivingCallout } from '@/lib/plan/hub/plan-living-callout';

const PlanAdapter = dynamic(
  () => import('@/components/coach/plan/plan-adapter').then((mod) => mod.PlanAdapter),
  { ssr: false },
);

/**
 * Between destination and week decision — elevates adjust when Twin + #92 align.
 */
export function PlanLivingSlot() {
  const model = usePlanHubModel();
  const [adapterOpen, setAdapterOpen] = useState(false);

  const callout = useMemo(() => {
    if (!model.weekReady || !model.week) {
      return null;
    }
    const remaining = model.week.remaining
      .filter((entry) => entry.planned)
      .map((entry) => ({
        id: entry.planned!.id,
        date: entry.planned!.date,
        intensity: entry.planned!.intensity,
        completed: false,
      }));
    return buildPlanLivingCallout({
      hasDatedGoal: Boolean(model.goal?.targetDate),
      hasActiveMacro: Boolean(model.macroRail),
      hasRemainingSessions: remaining.length > 0,
      goalLabel: model.goal?.title ?? null,
      verdict: model.verdict,
      remaining,
    });
  }, [model.goal, model.macroRail, model.verdict, model.week, model.weekReady]);

  if (!callout) {
    return null;
  }

  return (
    <>
      <PlanLivingCallout callout={callout} onAdjust={() => setAdapterOpen(true)} />
      {adapterOpen ? (
        <PlanAdapter
          initialFocus={
            callout.kind === 'protect'
              ? 'Twin en mode prudence. Allège ou décale les séances exigeantes pour absorber le feedback récent.'
              : 'Twin en capacité de pousser. Réarrange la semaine pour mieux utiliser cette fenêtre vers l’objectif.'
          }
          onClose={() => setAdapterOpen(false)}
        />
      ) : null}
    </>
  );
}
