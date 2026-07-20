'use client';

import { GoalKind } from '@prisma/client';
import { MobileBackLink } from '@/components/layout/mobile-back-link';
import { StickyHeader } from '@/components/layout/sticky-header';
import {
  GoalsToolbar,
  MetricGoalCard,
  RaceCard,
  type GoalItem,
} from '@/components/goals/goal-cards';
import { GoalAchievementsHistory } from '@/components/goals/goal-achievements-history';
import { GoalsViewSkeleton } from '@/components/goals/goals-view-skeleton';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { horizonLabels, horizonOrder } from '@/lib/goals';
import { useGoals } from '@/hooks/use-data';
import { Flag, Target } from 'lucide-react';

function toGoalItem(goal: {
  id: string;
  title: string;
  kind: GoalKind;
  horizon: GoalItem['horizon'];
  metricKey?: string | null;
  startValue: number | null;
  currentValue: number | null;
  targetValue: number | null;
  unit: string | null;
  lowerIsBetter: boolean;
  targetDate: Date | null;
  location: string | null;
  achieved: boolean;
  notes: string | null;
  priority: GoalItem['priority'];
  raceFormat: string | null;
  targetPerformance: string | null;
  validatingActivityId?: string | null;
  lastAchievedAt?: Date | string | null;
}): GoalItem {
  return {
    id: goal.id,
    title: goal.title,
    kind: goal.kind,
    horizon: goal.horizon,
    metricKey: goal.metricKey,
    startValue: goal.startValue,
    currentValue: goal.currentValue,
    targetValue: goal.targetValue,
    unit: goal.unit,
    lowerIsBetter: goal.lowerIsBetter,
    targetDate: goal.targetDate,
    location: goal.location,
    achieved: goal.achieved,
    notes: goal.notes,
    priority: goal.priority,
    raceFormat: goal.raceFormat,
    targetPerformance: goal.targetPerformance,
    validatingActivityId: goal.validatingActivityId,
    lastAchievedAt: goal.lastAchievedAt,
  };
}

export function GoalsView() {
  const goalsQuery = useGoals();

  if (goalsQuery.isPending) {
    return <GoalsViewSkeleton />;
  }

  if (goalsQuery.isError) {
    return (
      <p className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-6 text-sm">
        Impossible de charger les objectifs. Réessaie dans un instant.
      </p>
    );
  }

  const goals = (goalsQuery.data ?? []).map(toGoalItem);

  const races = goals
    .filter((g) => g.kind === GoalKind.RACE)
    .sort((a, b) => {
      const da = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
      const db = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
      return da - db;
    });

  const metrics = goals.filter((g) => g.kind === GoalKind.METRIC);

  return (
    <div className="space-y-8">
      <MobileBackLink href="/settings" label="Réglages" showOnDesktop />
      <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-label">Réglages</p>
          <h1 className="text-page-title mt-1">Objectifs</h1>
          <p className="text-muted-foreground mt-1">
            Des courses aux objectifs hebdomadaires — toute la hiérarchie.
          </p>
        </div>
        <GoalsToolbar />
      </StickyHeader>

      <section className="space-y-4">
        <h2 className="text-label">Courses à venir</h2>
        {races.length ? (
          <div className="space-y-3">
            {races.map((race) => (
              <RaceCard key={race.id} goal={race} />
            ))}
          </div>
        ) : (
          <InkEmptyState
            description="Ajoute une course cible pour ancrer ton plan."
            icon={Flag}
            title="Aucune course planifiée"
            bleed
            compact
          />
        )}
      </section>

      <section className="space-y-6">
        <h2 className="text-label">Objectifs chiffrés</h2>
        {metrics.length ? (
          <>
            {horizonOrder.map((horizon) => {
              const group = metrics.filter((g) => g.horizon === horizon);
              if (!group.length) return null;
              return (
                <div key={horizon} className="space-y-3">
                  <h3 className="text-primary/80 text-xs font-medium tracking-wider uppercase">
                    {horizonLabels[horizon]}
                  </h3>
                  <div className="grid gap-3 md:grid-cols-2">
                    {group.map((goal) => (
                      <MetricGoalCard key={goal.id} goal={goal} />
                    ))}
                  </div>
                </div>
              );
            })}
            {metrics.some((g) => !g.horizon) && (
              <div className="space-y-3">
                <h3 className="text-primary/80 text-xs font-medium tracking-wider uppercase">
                  Autres
                </h3>
                <div className="grid gap-3 md:grid-cols-2">
                  {metrics
                    .filter((g) => !g.horizon)
                    .map((goal) => (
                      <MetricGoalCard key={goal.id} goal={goal} />
                    ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <InkEmptyState
            description="Crée-en un pour suivre ta progression chiffrée."
            icon={Target}
            title="Aucun objectif chiffré"
            bleed
            compact
          />
        )}
      </section>

      <GoalAchievementsHistory />
    </div>
  );
}
