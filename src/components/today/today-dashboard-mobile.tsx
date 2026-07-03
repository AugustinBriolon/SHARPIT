'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { ConfidencePanel } from './dashboard/confidence-panel';
import { HealthMonitorPanel } from './dashboard/health-monitor-panel';
import { PlanningRow } from './dashboard/planning-row';
import { ScoreCard } from './dashboard/score-card';
import type {
  AdaptationDecisionVerdict,
  PhysiologicalConsistency,
  TodayDashboardViewModel,
} from './dashboard/use-today-dashboard-view-model';
import { NarrativeHeader } from './narrative-header';
import { SessionBlock } from './session-block';
import { cn } from '@/lib/utils';

export function TodayDashboardMobile({ vm }: { vm: TodayDashboardViewModel }) {
  const { reasoning, adaptation } = vm;
  const [confidenceOpen, setConfidenceOpen] = useState(false);

  return (
    <div className="space-y-5">
      {/* 1. Décision du jour */}
      <section aria-labelledby="today-decision" className="space-y-3">
        <NarrativeHeader
          computedAt={reasoning.computedAt}
          confidence={reasoning.confidence}
          topAction={reasoning.topAction!}
          verdict={reasoning.overallVerdict}
        />

        <button
          aria-expanded={confidenceOpen}
          className="text-muted-foreground hover:text-foreground flex min-h-11 w-full items-center justify-between rounded-xl border px-4 py-2.5 text-left text-xs transition-colors"
          type="button"
          onClick={() => setConfidenceOpen((o) => !o)}
        >
          <span>Fiabilité de l&apos;analyse</span>
          <ChevronDown
            className={cn('size-4 transition-transform', confidenceOpen && 'rotate-180')}
            aria-hidden
          />
        </button>

        {confidenceOpen && (
          <ConfidencePanel
            availableModelCount={reasoning.signals.availableModelCount}
            computedAt={reasoning.computedAt}
            confidence={reasoning.confidence}
            consistencyScore={reasoning.consistencyScore}
            dataCompleteness={reasoning.dataCompleteness}
            limitingFactor={reasoning.limitingFactor}
            modelDirections={reasoning.signals.modelDirections}
            overallVerdict={reasoning.overallVerdict}
            recoveryDimCount={vm.recoveryDimCount}
            physiologicalConsistency={
              reasoning.physiologicalConsistency as PhysiologicalConsistency
            }
          />
        )}
      </section>

      {/* 2–4. Métriques clés */}
      <section aria-label="Indicateurs du jour" className="space-y-3">
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
          variant="mobile"
          higherIsBetter
        />
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
          variant="mobile"
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
          variant="mobile"
        />
      </section>

      {/* 5. Séance recommandée */}
      <section aria-labelledby="today-session">
        <SessionBlock
          adaptationVerdict={(adaptation?.decision.verdict as AdaptationDecisionVerdict) ?? null}
          daySummary={vm.daySummary}
          keyFindings={reasoning.keyFindings}
          recommendation={vm.primaryRecommendation}
        />
      </section>

      {/* 6. Health Monitor */}
      <section aria-label="Moniteur santé">
        <HealthMonitorPanel entries={vm.healthEntries} entry={vm.todayEntry} compact />
      </section>

      {/* 7. Prochaines séances */}
      <section aria-label="Séances à venir">
        <PlanningRow sessions={vm.plannedSessions} mobile />
      </section>
    </div>
  );
}
