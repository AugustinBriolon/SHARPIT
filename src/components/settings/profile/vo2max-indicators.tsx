import { ActivityType } from '@prisma/client';
import { ActivityTypeIndicator } from '@/components/ui/instruments/activity-type-indicator';

export function Vo2maxIndicators({
  vo2maxRunning,
  vo2maxCycling,
}: {
  vo2maxRunning: number | null;
  vo2maxCycling: number | null;
}) {
  if (vo2maxRunning === null && vo2maxCycling === null) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {vo2maxRunning !== null ? (
        <div className="bg-muted/40 rounded-analysis border-analysis-border/60 flex items-center gap-2 border px-2.5 py-1.5">
          <ActivityTypeIndicator type={ActivityType.RUN} />
          <span className="text-label">VO2max</span>
          <span className="text-data text-sm font-semibold tabular-nums">{vo2maxRunning}</span>
        </div>
      ) : null}
      {vo2maxCycling !== null ? (
        <div className="bg-muted/40 rounded-analysis border-analysis-border/60 flex items-center gap-2 border px-2.5 py-1.5">
          <ActivityTypeIndicator type={ActivityType.BIKE} />
          <span className="text-label">VO2max</span>
          <span className="text-data text-sm font-semibold tabular-nums">{vo2maxCycling}</span>
        </div>
      ) : null}
      <span className="text-muted-foreground text-xs">Garmin · lecture seule</span>
    </div>
  );
}
