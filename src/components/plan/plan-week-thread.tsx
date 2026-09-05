import { PlanDoneList, PlanRemainingList } from '@/components/plan/plan-week-entries';
import { PlanLoadTrendSection } from '@/components/plan/plan-load-trend';
import { PlanProjectionSection } from '@/components/plan/plan-projection-section';
import { selectHubDoneEntries, selectHubRemainingEntries } from '@/lib/plan/plan-week-previews';
import type { PlanLoadTrend } from '@/lib/plan/plan-load-trend';
import type { PlanWeek } from '@/lib/plan/plan-week';

function BlockState({ trend }: { trend: PlanLoadTrend }) {
  return (
    <section className="space-y-2">
      <p className="text-label">État du bloc</p>
      <PlanLoadTrendSection trend={trend} compact />
    </section>
  );
}

export function PlanWeekThread({
  now,
  week,
  gateActive,
  loadTrend,
  excludePlannedId = null,
}: {
  now: Date;
  week: PlanWeek;
  gateActive: boolean;
  loadTrend: PlanLoadTrend | null;
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
      {loadTrend ? <BlockState trend={loadTrend} /> : null}
      <section className="space-y-2">
        <p className="text-label">Projection</p>
        <PlanProjectionSection now={now} embedded />
      </section>
    </div>
  );
}
