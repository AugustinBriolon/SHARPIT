import { PlanDoneList, PlanRemainingList } from '@/components/plan/plan-week-entries';
import { PlanProjectionSection } from '@/components/plan/plan-projection-section';
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
    <div className="space-y-5">
      {remaining ? (
        <PlanRemainingList
          entries={week.remaining}
          excludePlannedId={excludePlannedId}
          gateActive={gateActive}
        />
      ) : null}
      {done ? <PlanDoneList entries={week.done} /> : null}
      <section className="space-y-2">
        <h3 className="text-section-title">Projection</h3>
        <PlanProjectionSection now={now} embedded />
      </section>
    </div>
  );
}
