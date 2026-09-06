'use client';

import { CalendarDays } from 'lucide-react';
import { PlanSectionHeading } from '@/components/plan/plan-section-heading';
import { PlannedSessionPreview } from '@/components/today/rich/planned-session-preview';
import { Button } from '@/components/ui/button';
import { LinkButton } from '@/components/ui/link-button';
import type { WeekDecision, WeekDecisionAction } from '@/lib/plan/plan-week-decision';
import type { PlanWeek } from '@/lib/plan/plan-week';
import { buildPlannedSessionPreview } from '@/lib/today/planned-session-metrics';
import type { ThreadEntry } from '@/lib/training/thread/thread-model';
import { useAppModal } from '@/providers/app-modal-provider';

function isPlanningNav(action: WeekDecisionAction): boolean {
  return (
    action.href === '/plan/semaine' && action.sessionId === null && action.label === 'Planning'
  );
}

function decisionEntry(week: PlanWeek, sessionId: string | null): ThreadEntry | null {
  if (!sessionId) {
    return null;
  }
  return week.remaining.find((entry) => entry.planned?.id === sessionId) ?? null;
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

function NextSessionCard({ entry, gated }: { entry: ThreadEntry; gated: boolean }) {
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
  const next = decisionEntry(week, decision.primary.sessionId);
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
        <NextSessionCard entry={next} gated={decision.kind === 'gated'} />
      ) : showPrimary ? (
        <DecisionAction action={decision.primary} />
      ) : null}
    </section>
  );
}
