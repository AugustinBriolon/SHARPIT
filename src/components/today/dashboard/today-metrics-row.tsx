import { TWIN_DRILL_DOWN } from '@/lib/today-twin-navigation';
import { RadialScoreCard } from './radial-score-card';
import type { TodayViewModel } from '@/core/presentation/today-view-model';

type MetricsRowVm = TodayViewModel['hero']['metricsRow'];

function MetricsCards({ metricsRow, compact }: { metricsRow: MetricsRowVm; compact: boolean }) {
  return (
    <>
      <RadialScoreCard
        colorMode="neutral"
        compact={compact}
        format="percent"
        href={TWIN_DRILL_DOWN.sleep}
        label="Sommeil"
        max={100}
        value={metricsRow.sleepScore}
      />
      <RadialScoreCard
        colorMode="dynamic"
        compact={compact}
        format="percent"
        href={TWIN_DRILL_DOWN.recovery}
        label="Récupération"
        max={100}
        value={metricsRow.recoveryScore}
      />
      <RadialScoreCard
        colorMode="strain"
        compact={compact}
        format="strain"
        href={TWIN_DRILL_DOWN.effort}
        label="Effort"
        max={21}
        unavailableCaption={metricsRow.effortUnavailableCaption}
        value={metricsRow.effortScore}
      />
      <RadialScoreCard
        colorMode="dynamic"
        compact={compact}
        format="percent"
        href={TWIN_DRILL_DOWN.adaptation}
        label="Adaptation"
        max={100}
        unavailableCaption={metricsRow.adaptationUnavailableCaption}
        value={metricsRow.adaptationScore}
      />
    </>
  );
}

export function TodayMetricsRow({ metricsRow }: { metricsRow: MetricsRowVm }) {
  return (
    <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 sm:gap-3">
      <MetricsCards compact={false} metricsRow={metricsRow} />
    </div>
  );
}
