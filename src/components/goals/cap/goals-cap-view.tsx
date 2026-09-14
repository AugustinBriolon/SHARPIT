'use client';

import { useEffect } from 'react';
import { Target } from 'lucide-react';
import { GoalCapHero, GoalCapHeroSkeleton } from '@/components/goals/cap/goal-cap-hero';
import { GoalCapInventory } from '@/components/goals/cap/goal-cap-inventory';
import { GoalCapStats, GoalCapStatsSkeleton } from '@/components/goals/cap/goal-cap-stats';
import type { GoalItem } from '@/components/goals/cards/goal-cards';
import { GoalAchievementsHistory } from '@/components/goals/cards/goal-achievements-history';
import { GoalsViewSkeleton } from '@/components/goals/goals-view-skeleton';
import { InkEmptyState } from '@/components/ui/ink-empty-state';
import { toEditGoal, useGoalCapModel } from '@/hooks/use-goal-cap-model';
import type { GoalCapHeroView } from '@/lib/goals/goal-cap';
import type { GoalCapStatsView } from '@/lib/goals/goal-cap-stats';
import type { GoalPositionAuditView } from '@/lib/goals/goal-position-audit';

function useGoalHashScroll(ready: boolean) {
  useEffect(() => {
    if (!ready || typeof window === 'undefined') {
      return;
    }
    const hash = window.location.hash.replace(/^#/, '');
    if (!hash.startsWith('goal-')) {
      return;
    }
    const el = document.getElementById(hash);
    if (!el) {
      return;
    }
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.add('ring-primary/40', 'ring-2');
    const timer = window.setTimeout(() => {
      el.classList.remove('ring-primary/40', 'ring-2');
    }, 1600);
    return () => window.clearTimeout(timer);
  }, [ready]);
}

function CapEmpty({ inventory }: { inventory: readonly GoalItem[] }) {
  return (
    <div className="space-y-8">
      <InkEmptyState
        description="Sans échéance, le Twin ne peut ni mesurer le volume vers un cap ni projeter ce qui reste atteignable."
        icon={Target}
        title="Aucun cap actif"
        bleed
      />
      <GoalCapInventory inventory={inventory} />
      <GoalAchievementsHistory />
    </div>
  );
}

function CapLoaded({
  hero,
  inventory,
  position,
  primaryItem,
  stats,
}: {
  hero: GoalCapHeroView;
  primaryItem: GoalItem;
  stats: GoalCapStatsView | null;
  position: GoalPositionAuditView | null;
  inventory: readonly GoalItem[];
}) {
  return (
    <div className="space-y-4">
      <GoalCapHero editGoal={toEditGoal(primaryItem)} hero={hero} />
      {stats ? <GoalCapStats position={position} stats={stats} /> : <GoalCapStatsSkeleton />}
      <div className="pt-2">
        <GoalCapInventory inventory={inventory} />
      </div>
      <GoalAchievementsHistory />
    </div>
  );
}

/** Objectifs suivi — Cap identity, goal-scoped volume, position audit. Not a Plan clone. */
export function GoalsCapView() {
  const model = useGoalCapModel();
  useGoalHashScroll(model.status === 'ready' && model.scrollReady);

  if (model.status === 'pending') {
    return <GoalsViewSkeleton embedded />;
  }
  if (model.status === 'error') {
    return (
      <p
        className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border p-6 text-sm"
        role="alert"
      >
        Impossible de charger les objectifs. Réessaie dans un instant.
      </p>
    );
  }
  if (!model.hero || !model.primaryItem) {
    return <CapEmpty inventory={model.inventory} />;
  }

  return (
    <CapLoaded
      hero={model.hero}
      inventory={model.inventory}
      position={model.position}
      primaryItem={model.primaryItem}
      stats={model.stats}
    />
  );
}

export function GoalsCapViewSkeleton() {
  return (
    <div className="space-y-4">
      <GoalCapHeroSkeleton />
      <GoalCapStatsSkeleton />
    </div>
  );
}
