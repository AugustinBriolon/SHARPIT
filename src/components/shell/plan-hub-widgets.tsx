'use client';

import { format, startOfWeek } from 'date-fns';
import { PlanActions } from '@/components/plan/plan-actions';
import {
  PlanDestinationPlate,
  PlanDestinationPlateSkeleton,
} from '@/components/plan/plan-destination-plate';
import { PlanWeekDecision, PlanWeekDecisionSkeleton } from '@/components/plan/plan-week-decision';
import { PlanWeekThread } from '@/components/plan/plan-week-thread';
import { usePlanHubModel } from '@/hooks/use-plan-hub-model';
import { useProjectedAthleteViewModel } from '@/hooks/use-projected-athlete-view-model';
import { useWeeklyCoachingBriefViewModel } from '@/hooks/use-data';
import { shouldGateHardIntensities } from '@/lib/plan/intensity-gate';
import { buildWeekDecision, type WeekDecision } from '@/lib/plan/plan-week-decision';

const WEEK_OPTS = { weekStartsOn: 1 as const };

type PlanHubModel = ReturnType<typeof usePlanHubModel>;

function useHubWeekDecision(model: PlanHubModel): WeekDecision | null {
  const projection = useProjectedAthleteViewModel(7);
  const brief = useWeeklyCoachingBriefViewModel(
    model.now ? format(startOfWeek(model.now, WEEK_OPTS), 'yyyy-MM-dd') : '',
  );
  if (!model.week) {
    return null;
  }
  return buildWeekDecision({
    week: model.week,
    verdict: model.verdict,
    cautionLabel: projection.data?.caution?.label ?? null,
    hasBrief: Boolean(brief.data?.visible),
  });
}

function DestinationSlot({ model }: { model: PlanHubModel }) {
  if (model.goalsPending) {
    return <PlanDestinationPlateSkeleton />;
  }
  return <PlanDestinationPlate goal={model.goal} rail={model.macroRail} />;
}

function DecisionSlot({ model, decision }: { model: PlanHubModel; decision: WeekDecision | null }) {
  if (model.weekReady && model.week && decision) {
    return <PlanWeekDecision decision={decision} week={model.week} />;
  }
  return <PlanWeekDecisionSkeleton />;
}

function ThreadSlot({ model, decision }: { model: PlanHubModel; decision: WeekDecision | null }) {
  if (!model.weekReady || !model.week || !model.now) {
    return null;
  }
  return (
    <PlanWeekThread
      excludePlannedId={decision?.primary.sessionId ?? null}
      gateActive={shouldGateHardIntensities(model.verdict)}
      now={model.now}
      week={model.week}
    />
  );
}

export function PlanHubWidgets() {
  const model = usePlanHubModel();
  const decision = useHubWeekDecision(model);

  return (
    <div className="space-y-4">
      <DestinationSlot model={model} />
      <DecisionSlot decision={decision} model={model} />
      <ThreadSlot decision={decision} model={model} />
      <PlanActions calibration={model.calibration} />
    </div>
  );
}
