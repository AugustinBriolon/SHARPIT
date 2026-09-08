'use client';

import { CalendarDays } from 'lucide-react';
import { PlanSectionHeading } from '@/components/plan/hub/plan-section-heading';
import { BrickOverviewCard } from '@/components/planning/brick/brick-overview-card';
import { PlannedSessionPreview } from '@/components/today/rich/planned-session-preview';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import type { WeekDecision, WeekDecisionAction } from '@/lib/plan/week/plan-week-decision';
import type { PlanWeek } from '@/lib/plan/week/plan-week';
import {
  resolveDecisionSessionBlock,
  type HubRemainingItem,
} from '@/lib/plan/week/plan-week-previews';
import { brickLegSummaries } from '@/lib/planned-session/brick/brick-sessions';
import { formatPlannedDuration } from '@/lib/planned-session/sessions';
import { buildPlannedSessionPreview } from '@/lib/today/rich/planned-session-metrics';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import type { ClientPlannedSession } from '@/lib/query/types';
import { useAppModal } from '@/providers/app-modal-provider';

function isPlanningNav(action: WeekDecisionAction): boolean {
  return (
    action.href === '/plan/semaine' && action.sessionId === null && action.label === 'Planning'
  );
}

function DecisionAction({ action }: { action: WeekDecision['primary'] }) {
  const { openPlannedSession } = useAppModal();

  if (action.sessionId) {
    return (
      <Button
        size="sm"
        type="button"
        variant="outline"
        onClick={() => openPlannedSession({ sessionId: action.sessionId! })}
      >
        {action.label}
      </Button>
    );
  }

  return <PlanningLink action={action} />;
}

function PlanningLink({ action }: { action: WeekDecisionAction }) {
  return (
    <LinkButton href={action.href} size="sm" variant="outline">
      {isPlanningNav(action) ? <CalendarDays aria-hidden /> : null}
      {action.label}
    </LinkButton>
  );
}

function brickSubtitle(sessions: ClientPlannedSession[]): string | null {
  const totalMin = sessions.reduce((sum, session) => sum + (session.durationMin ?? 0), 0);
  return totalMin > 0 ? formatPlannedDuration(totalMin) : null;
}

function NextSingleCard({ entry, gated }: { entry: ThreadEntry; gated: boolean }) {
  const { openPlannedSession } = useAppModal();
  const { planned } = entry;
  if (!planned) {
    return null;
  }

  const preview = buildPlannedSessionPreview({
    type: planned.type,
    durationMin: planned.durationMin,
    intensity: planned.intensity,
    load: planned.load,
    title: planned.title,
    description: planned.description,
    accessories: planned.accessories,
    strengthPrescription: planned.strengthPrescription,
  });

  return (
    <PlannedSessionPreview
      activityType={entry.type}
      density="compact"
      equipment={preview.equipment}
      metrics={preview.metrics}
      morningChoiceLabel={gated ? 'Intensité en pause' : null}
      secondary={planned.description}
      title={entry.title}
      primary
      onOpen={() => openPlannedSession({ sessionId: planned.id })}
    />
  );
}

function NextBrickCard({
  block,
  gated,
}: {
  block: Extract<HubRemainingItem, { kind: 'brick' }>;
  gated: boolean;
}) {
  const { openPlannedSession } = useAppModal();
  const plannedLegs = block.entries
    .map((entry) => entry.planned)
    .filter((session): session is ClientPlannedSession => Boolean(session));
  if (plannedLegs.length === 0) {
    return null;
  }

  return (
    <BrickOverviewCard
      badge={gated ? 'Intensité en pause' : null}
      legs={brickLegSummaries(plannedLegs)}
      subtitle={brickSubtitle(plannedLegs)}
      primary
      onOpenLeg={(legId) => openPlannedSession({ sessionId: legId })}
    />
  );
}

function NextSessionBlock({
  week,
  sessionId,
  gated,
}: {
  week: PlanWeek;
  sessionId: string | null;
  gated: boolean;
}) {
  const block = resolveDecisionSessionBlock(week.remaining, sessionId);
  if (!block) {
    return null;
  }
  if (block.kind === 'brick') {
    return <NextBrickCard block={block} gated={gated} />;
  }
  return <NextSingleCard entry={block.entry} gated={gated} />;
}

export function PlanWeekDecisionSkeleton() {
  return (
    <div className="space-y-3" aria-busy>
      <div className="flex items-center justify-between gap-3">
        <div className="bg-analysis-surface-alt/60 h-8 max-w-sm flex-1 animate-pulse rounded-md" />
        <div className="bg-analysis-surface-alt/60 h-8 w-24 shrink-0 animate-pulse rounded-md" />
      </div>
      <div className="analysis-panel rounded-analysis-lg h-28 animate-pulse" />
    </div>
  );
}

export function PlanWeekDecision({ decision, week }: { decision: WeekDecision; week: PlanWeek }) {
  const next = resolveDecisionSessionBlock(week.remaining, decision.primary.sessionId);
  const headingAction =
    decision.secondary ?? (isPlanningNav(decision.primary) ? decision.primary : null);
  const showPrimary = !next && headingAction !== decision.primary;

  return (
    <section aria-labelledby="plan-week-decision" className="space-y-3">
      <PlanSectionHeading
        action={headingAction ? <PlanningLink action={headingAction} /> : null}
        heading="h2"
        id="plan-week-decision"
        title={decision.sentence}
      />
      {next ? (
        <NextSessionBlock
          gated={decision.kind === 'gated'}
          sessionId={decision.primary.sessionId}
          week={week}
        />
      ) : showPrimary ? (
        <DecisionAction action={decision.primary} />
      ) : null}
    </section>
  );
}
