import { TWIN_DRILL_DOWN } from '@/lib/today-twin-navigation';
import { RadialScoreCard } from './radial-score-card';
import type { TodayDashboardViewModel } from './use-today-dashboard-view-model';

type MetricsVm = Pick<
  TodayDashboardViewModel,
  'sleepScore' | 'recovery' | 'dailyStrain' | 'effortUnavailableMessage' | 'adaptation'
>;

function MetricsCards({ vm, compact }: { vm: MetricsVm; compact: boolean }) {
  const strainScore =
    vm.dailyStrain?.available && vm.dailyStrain.strainScore != null
      ? vm.dailyStrain.strainScore
      : null;

  return (
    <>
      <RadialScoreCard
        colorMode="neutral"
        compact={compact}
        format="percent"
        href={TWIN_DRILL_DOWN.sleep}
        label="Sommeil"
        max={100}
        value={vm.sleepScore}
      />
      <RadialScoreCard
        colorMode="dynamic"
        compact={compact}
        format="percent"
        href={TWIN_DRILL_DOWN.recovery}
        label="Récupération"
        max={100}
        value={vm.recovery?.readinessScore ?? null}
      />
      <RadialScoreCard
        colorMode="strain"
        compact={compact}
        format="strain"
        href={TWIN_DRILL_DOWN.effort}
        label="Effort"
        max={21}
        unavailableCaption={strainScore == null ? vm.effortUnavailableMessage : null}
        value={strainScore}
      />
      <RadialScoreCard
        colorMode="dynamic"
        compact={compact}
        format="percent"
        href={TWIN_DRILL_DOWN.adaptation}
        label="Adaptation"
        max={100}
        value={vm.adaptation?.adaptationIndex ?? null}
        unavailableCaption={
          vm.adaptation?.adaptationIndex == null ? 'Historique insuffisant' : null
        }
      />
    </>
  );
}

export function TodayMetricsRow({ vm }: { vm: MetricsVm }) {
  return (
    <div className="grid grid-cols-2 gap-1 sm:grid-cols-4 sm:gap-3">
      <MetricsCards vm={vm} compact />
    </div>
  );
}
