import { ScoreCard } from './score-card';
import type { TodayDashboardViewModel } from './use-today-dashboard-view-model';

export function TodayScoreCardsRow({
  vm,
}: {
  vm: Pick<
    TodayDashboardViewModel,
    | 'recovery'
    | 'fatigue'
    | 'recoverySpark'
    | 'effortSpark'
    | 'sleepSpark'
    | 'recoveryDelta'
    | 'sleepDelta'
    | 'recoverySignal'
    | 'fatigueSignal'
    | 'sleepSignal'
    | 'sleepScore'
    | 'recoverySubMetrics'
    | 'effortSubMetrics'
    | 'sleepSubMetrics'
  >;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <ScoreCard
        cardClass="bg-amber-50/80 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/40"
        delta={null}
        deltaVariant="amber"
        higherIsBetter={false}
        href="/today/effort"
        label="Charge d'effort"
        score={vm.fatigue?.fatigueIndex ?? null}
        sparklineStroke="#f59e0b"
        sparklineValues={vm.effortSpark}
        subMetrics={vm.effortSubMetrics}
        trendArrow={vm.fatigueSignal.arrow}
        trendClass={vm.fatigueSignal.qualityClass}
        trendLabel={vm.fatigueSignal.label}
      />
      <ScoreCard
        cardClass="bg-emerald-50/80 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-800/40"
        delta={vm.recoveryDelta}
        deltaVariant="emerald"
        href="/today/recovery"
        label="Récupération"
        score={vm.recovery?.readinessScore ?? null}
        sparklineStroke="#10b981"
        sparklineValues={vm.recoverySpark}
        subMetrics={vm.recoverySubMetrics}
        trendArrow={vm.recoverySignal.arrow}
        trendClass={vm.recoverySignal.qualityClass}
        trendLabel={vm.recoverySignal.label}
        higherIsBetter
      />
      <ScoreCard
        cardClass="bg-blue-50/80 border-blue-200 dark:bg-blue-950/20 dark:border-blue-800/40"
        delta={vm.sleepDelta}
        deltaVariant="blue"
        href="/today/sleep"
        label="Sommeil"
        score={vm.sleepScore}
        sparklineStroke="#3b82f6"
        sparklineValues={vm.sleepSpark}
        subMetrics={vm.sleepSubMetrics}
        trendArrow={vm.sleepSignal.arrow}
        trendClass={vm.sleepSignal.colorClass}
        trendLabel={vm.sleepSignal.label}
        higherIsBetter
      />
    </div>
  );
}
