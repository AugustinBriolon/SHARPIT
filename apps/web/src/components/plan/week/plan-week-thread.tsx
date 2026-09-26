import { ClipboardList } from 'lucide-react';
import { PlanSectionHeading } from '@/components/plan/hub/plan-section-heading';
import { PlanDoneList, PlanRemainingList } from '@/components/plan/week/plan-week-entries';
import { PlanProjectionSection } from '@/components/plan/hub/plan-projection-section';
import { LinkButton } from '@/components/ui/link-button';
import {
  selectHubDoneEntries,
  selectHubRemainingEntries,
} from '@sharpit/server/lib/plan/week/plan-week-previews';
import { upcomingRemaining } from '@sharpit/server/lib/plan/week/plan-week-decision';
import type { PlanWeek } from '@sharpit/server/lib/plan/week/plan-week';

export function PlanWeekThread({
  now,
  week,
  gateActive,
  excludePlannedId = null,
}: {
  now: Date;
  week: PlanWeek;
  gateActive: boolean;
  excludePlannedId?: string | null;
}) {
  const ahead = upcomingRemaining(week.remaining, now);
  const remaining = selectHubRemainingEntries(ahead, excludePlannedId).featured.length > 0;
  const done = selectHubDoneEntries(week.done).featured.length > 0;

  return (
    <>
      {remaining ? (
        <PlanRemainingList
          entries={ahead}
          excludePlannedId={excludePlannedId}
          gateActive={gateActive}
        />
      ) : null}
      {done ? <PlanDoneList entries={week.done} /> : null}
      <section className="space-y-2">
        <PlanSectionHeading
          title="Projection"
          action={
            <LinkButton href="/plan/bilan" size="sm" variant="outline">
              <ClipboardList aria-hidden />
              Voir le bilan
            </LinkButton>
          }
        />
        <PlanProjectionSection now={now} embedded />
      </section>
    </>
  );
}
