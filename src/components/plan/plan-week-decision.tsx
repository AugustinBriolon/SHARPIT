'use client';

import Link from 'next/link';
import { PlanWeekStrip } from '@/components/plan/plan-week-strip';
import type { WeekDecision } from '@/lib/plan/plan-week-decision';
import type { PlanWeek } from '@/lib/plan/plan-week';
import { athleteVisibleCopy } from '@/lib/plan/athlete-visible-copy';
import { useAppModal } from '@/providers/app-modal-provider';

const ACTION_CLASS =
  'chip-surface hover:border-primary/25 focus-visible:ring-primary/35 inline-flex min-h-10 items-center rounded-analysis px-3 text-sm focus-visible:ring-2 focus-visible:outline-hidden';

function DecisionAction({ action }: { action: WeekDecision['primary'] }) {
  const { openPlannedSession } = useAppModal();

  if (action.sessionId) {
    return (
      <button
        className={ACTION_CLASS}
        type="button"
        onClick={() => openPlannedSession({ sessionId: action.sessionId! })}
      >
        {action.label}
      </button>
    );
  }

  return (
    <Link className={ACTION_CLASS} href={action.href}>
      {action.label}
    </Link>
  );
}

export function PlanWeekDecisionSkeleton() {
  return (
    <div className="space-y-3" aria-busy>
      <div className="bg-analysis-surface-alt/60 h-8 max-w-sm animate-pulse rounded-md" />
      <div className="analysis-panel rounded-analysis-lg h-16 animate-pulse" />
    </div>
  );
}

export function PlanWeekDecision({ decision, week }: { decision: WeekDecision; week: PlanWeek }) {
  return (
    <section aria-labelledby="plan-week-decision" className="space-y-3">
      <div className="space-y-2">
        <h2 className="text-section-title text-pretty" id="plan-week-decision">
          {decision.sentence}
        </h2>
        {decision.reason ? (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {athleteVisibleCopy(decision.reason)}
          </p>
        ) : null}
        <DecisionAction action={decision.primary} />
      </div>
      <PlanWeekStrip days={week.days} />
    </section>
  );
}
