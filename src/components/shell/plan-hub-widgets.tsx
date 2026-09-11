'use client';

import { useRef } from 'react';
import { format, startOfWeek } from 'date-fns';
import {
  PlanDestinationPlate,
  PlanDestinationPlateSkeleton,
} from '@/components/plan/hub/plan-destination-plate';
import {
  PlanWeekDecision,
  PlanWeekDecisionSkeleton,
} from '@/components/plan/week/plan-week-decision';
import { PlanWeekThread } from '@/components/plan/week/plan-week-thread';
import { usePlanHubModel } from '@/hooks/use-plan-hub-model';
import { useProjectedAthleteViewModel } from '@/hooks/use-projected-athlete-view-model';
import { useWeeklyCoachingBriefViewModel } from '@/hooks/use-data';
import { shouldGateHardIntensities } from '@/lib/plan/trajectory/intensity-gate';
import { buildWeekDecision, type WeekDecision } from '@/lib/plan/week/plan-week-decision';

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
  const retained = useRef<{
    week: NonNullable<PlanHubModel['week']>;
    decision: WeekDecision;
  } | null>(null);

  if (model.weekReady && model.week && decision) {
    retained.current = { week: model.week, decision };
  }

  if (retained.current) {
    return <PlanWeekDecision decision={retained.current.decision} week={retained.current.week} />;
  }

  return <PlanWeekDecisionSkeleton />;
}

function ThreadSlot({ model, decision }: { model: PlanHubModel; decision: WeekDecision | null }) {
  const retained = useRef<{
    excludePlannedId: string | null;
    gateActive: boolean;
    now: Date;
    week: NonNullable<PlanHubModel['week']>;
  } | null>(null);

  if (model.weekReady && model.week && model.now) {
    retained.current = {
      excludePlannedId: decision?.primary.sessionId ?? null,
      gateActive: shouldGateHardIntensities(model.verdict),
      now: model.now,
      week: model.week,
    };
  }

  if (!retained.current) {
    return null;
  }

  const thread = retained.current;
  return (
    <PlanWeekThread
      excludePlannedId={thread.excludePlannedId}
      gateActive={thread.gateActive}
      now={thread.now}
      week={thread.week}
    />
  );
}

export function PlanHubWidgets() {
  const model = usePlanHubModel();
  const decision = useHubWeekDecision(model);

  return (
    <div className="space-y-8">
      <DestinationSlot model={model} />
      <DecisionSlot decision={decision} model={model} />
      <ThreadSlot decision={decision} model={model} />
    </div>
  );
}
