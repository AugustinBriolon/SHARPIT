import { fatigueIndexToWhoopStrain } from '@/lib/strain';
import { RadialScoreCard } from './radial-score-card';
import type { TodayDashboardViewModel } from './use-today-dashboard-view-model';

type MetricsVm = Pick<
  TodayDashboardViewModel,
  'sleepScore' | 'recovery' | 'fatigue' | 'sleepSignal' | 'recoverySignal' | 'fatigueSignal'
>;

function MetricsCards({ vm, compact }: { vm: MetricsVm; compact: boolean }) {
  const strainScore = fatigueIndexToWhoopStrain(vm.fatigue?.fatigueIndex ?? null);

  return (
    <>
      <RadialScoreCard
        colorMode="neutral"
        compact={compact}
        format="percent"
        href="/today/sleep"
        label="Sommeil"
        max={100}
        value={vm.sleepScore}
      />
      <RadialScoreCard
        colorMode="dynamic"
        compact={compact}
        format="percent"
        href="/today/recovery"
        label="Récupération"
        max={100}
        value={vm.recovery?.readinessScore ?? null}
      />
      <RadialScoreCard
        colorMode="strain"
        compact={compact}
        format="strain"
        href="/today/effort"
        label="Effort"
        max={21}
        value={strainScore}
      />
    </>
  );
}

export function TodayMetricsRow({ vm }: { vm: MetricsVm }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-2 lg:hidden">
        <MetricsCards vm={vm} compact />
      </div>
      <div className="hidden grid-cols-3 gap-3 lg:grid">
        <MetricsCards compact={false} vm={vm} />
      </div>
    </>
  );
}
