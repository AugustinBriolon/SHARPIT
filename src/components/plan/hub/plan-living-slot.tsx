'use client';

import { useMemo, useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { PlanLivingCallout } from '@/components/plan/hub/plan-living-callout';
import { PlanAdaptAppliedPanel } from '@/components/plan/adapt-applied-panel';
import { usePlanHubModel } from '@/hooks/use-plan-hub-model';
import { buildPlanLivingCallout } from '@/lib/plan/hub/plan-living-callout';
import {
  getAdaptAppliedAckSnapshot,
  parseAdaptAppliedAckSnapshot,
  shouldSuppressRearrangeAfterApply,
  subscribeAdaptAppliedAck,
} from '@/lib/plan/adapt-applied-ack';

const PlanAdapter = dynamic(
  () => import('@/components/coach/plan/plan-adapter').then((mod) => mod.PlanAdapter),
  { ssr: false },
);

/**
 * Between destination and week decision — elevates adjust when Twin + #92 align.
 * After apply, shows settled confirmation for the rest of the local day.
 */
function remainingFromWeek(week: NonNullable<ReturnType<typeof usePlanHubModel>['week']>) {
  return week.remaining
    .filter((entry) => entry.planned)
    .map((entry) => ({
      id: entry.planned!.id,
      date: entry.planned!.date,
      intensity: entry.planned!.intensity,
      completed: false,
    }));
}

export function PlanLivingSlot() {
  const model = usePlanHubModel();
  const [adapterOpen, setAdapterOpen] = useState(false);
  const ackSnapshot = useSyncExternalStore(
    subscribeAdaptAppliedAck,
    getAdaptAppliedAckSnapshot,
    () => '',
  );
  const adaptAck = useMemo(() => parseAdaptAppliedAckSnapshot(ackSnapshot), [ackSnapshot]);
  const settled = shouldSuppressRearrangeAfterApply(adaptAck);

  const callout = useMemo(() => {
    if (settled || !model.weekReady || !model.week) {
      return null;
    }
    const remaining = remainingFromWeek(model.week);
    return buildPlanLivingCallout({
      hasDatedGoal: Boolean(model.goal?.targetDate),
      hasActiveMacro: Boolean(model.macroRail),
      hasRemainingSessions: remaining.length > 0,
      goalLabel: model.goal?.title ?? null,
      verdict: model.verdict,
      remaining,
    });
  }, [model.goal, model.macroRail, model.verdict, model.week, model.weekReady, settled]);

  if (settled && adaptAck) {
    return <PlanAdaptAppliedPanel ack={adaptAck} />;
  }

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
