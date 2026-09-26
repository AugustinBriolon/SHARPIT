'use client';

import { GoalKind } from '@prisma/client';
import { Flag } from 'lucide-react';
import { MetricGoalCard, RaceCard, type GoalItem } from '@/components/goals/cards/goal-cards';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { horizonLabels, horizonOrder } from '@sharpit/app/lib/goals/goals';

function RaceInventory({ races }: { races: readonly GoalItem[] }) {
  if (races.length === 0) {
    return null;
  }
  return (
    <section aria-labelledby="goals-inventory-races" className="space-y-4">
      <h2 className="text-label" id="goals-inventory-races">
        Autres courses
      </h2>
      <div className="space-y-3">
        {races.map((race) => (
          <RaceCard key={race.id} goal={race} />
        ))}
      </div>
    </section>
  );
}

function MetricHorizonGroup({
  horizon,
  goals,
}: {
  horizon: (typeof horizonOrder)[number];
  goals: readonly GoalItem[];
}) {
  if (goals.length === 0) {
    return null;
  }
  return (
    <div className="space-y-3">
      <h3 className="text-primary/80 text-xs font-medium tracking-wider uppercase">
        {horizonLabels[horizon]}
      </h3>
      <div className="grid gap-3 md:grid-cols-2">
        {goals.map((goal) => (
          <MetricGoalCard key={goal.id} goal={goal} />
        ))}
      </div>
    </div>
  );
}

function MetricInventory({ metrics }: { metrics: readonly GoalItem[] }) {
  if (metrics.length === 0) {
    return null;
  }
  const ungrouped = metrics.filter((goal) => !goal.horizon);
  return (
    <section aria-labelledby="goals-inventory-metrics" className="space-y-6">
      <h2 className="text-label" id="goals-inventory-metrics">
        Objectifs chiffrés
      </h2>
      {horizonOrder.map((horizon) => (
        <MetricHorizonGroup
          key={horizon}
          goals={metrics.filter((goal) => goal.horizon === horizon)}
          horizon={horizon}
        />
      ))}
      {ungrouped.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-primary/80 text-xs font-medium tracking-wider uppercase">Autres</h3>
          <div className="grid gap-3 md:grid-cols-2">
            {ungrouped.map((goal) => (
              <MetricGoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

/** Secondary goals under the Cap — races then metrics, never competing with Cap. */
export function GoalCapInventory({ inventory }: { inventory: readonly GoalItem[] }) {
  if (inventory.length === 0) {
    return null;
  }

  const races = inventory
    .filter((goal) => goal.kind === GoalKind.RACE)
    .sort((a, b) => {
      const da = a.targetDate ? new Date(a.targetDate).getTime() : Infinity;
      const db = b.targetDate ? new Date(b.targetDate).getTime() : Infinity;
      return da - db;
    });
  const metrics = inventory.filter((goal) => goal.kind === GoalKind.METRIC);

  if (races.length === 0 && metrics.length === 0) {
    return (
      <InkEmptyState
        description="Le reste de ta hiérarchie apparaîtra ici."
        icon={Flag}
        title="Pas d’autres objectifs"
        bleed
        compact
      />
    );
  }

  return (
    <div className="space-y-8">
      <RaceInventory races={races} />
      <MetricInventory metrics={metrics} />
    </div>
  );
}
