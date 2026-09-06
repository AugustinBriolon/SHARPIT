import { ClipboardList } from 'lucide-react';
import { PlanSectionHeading } from '@/components/plan/plan-section-heading';
import { PlanDoneList, PlanRemainingList } from '@/components/plan/plan-week-entries';
import { PlanProjectionSection } from '@/components/plan/plan-projection-section';
import { LinkButton } from '@/components/ui/link-button';
import { selectHubDoneEntries, selectHubRemainingEntries } from '@/lib/plan/plan-week-previews';
import type { PlanWeek } from '@/lib/plan/plan-week';

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
  const remaining = selectHubRemainingEntries(week.remaining, excludePlannedId).featured.length > 0;
  const done = selectHubDoneEntries(week.done).featured.length > 0;

  return (
    <>
      {remaining ? (
        <PlanRemainingList
          entries={week.remaining}
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
