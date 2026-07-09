'use client';

import { GoalKind } from '@prisma/client';
import { StickyHeader } from '@/components/layout/sticky-header';
import {
  GoalsToolbar,
  MetricGoalCard,
  RaceCard,
  type GoalItem,
} from '@/components/goals/goal-cards';
import { GoalAchievementsHistory } from '@/components/goals/goal-achievements-history';
import { Skeleton } from '@/components/ui/skeleton';
import { horizonLabels, horizonOrder } from '@/lib/goals';
import { useGoals } from '@/hooks/use-data';

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
    return (
      <div className="space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-9 w-48" />
            <Skeleton className="h-4 w-72" />
          </div>
          <Skeleton className="h-9 w-28 rounded-lg" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-32" />
          <div className="space-y-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <Skeleton className="h-4 w-40" />
          <div className="grid gap-3 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-28 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
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
      <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-[11px] font-medium tracking-[0.15em] uppercase">
            Réglages
          </p>
          <h1 className="font-heading mt-2 text-3xl font-semibold">Objectifs</h1>
          <p className="text-muted-foreground mt-1">
            Des courses aux objectifs hebdomadaires — toute la hiérarchie.
          </p>
        </div>
        <GoalsToolbar />
      </StickyHeader>

      <section className="space-y-4">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
          Courses à venir
        </h2>
        {races.length ? (
          <div className="space-y-3">
            {races.map((race) => (
              <RaceCard key={race.id} goal={race} />
            ))}
          </div>
        ) : (
          <p className="border-border/80 text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
            Aucune course planifiée.
          </p>
        )}
      </section>

      <section className="space-y-6">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
          Objectifs chiffrés
        </h2>
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
          <p className="border-border/80 text-muted-foreground rounded-xl border border-dashed p-8 text-center text-sm">
            Aucun objectif chiffré. Crée-en un pour suivre ta progression.
          </p>
        )}
      </section>

      <GoalAchievementsHistory />
    </div>
  );
}
