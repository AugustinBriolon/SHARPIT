import { GoalCapHeroSkeleton } from '@/components/goals/cap/goal-cap-hero';
import { GoalCapStatsSkeleton } from '@/components/goals/cap/goal-cap-stats';
import { Skeleton } from '@/components/ui/skeleton';

/** Cap-first loading shell for `/moi/objectifs`. */
export function GoalsViewSkeleton({ embedded = false }: { embedded?: boolean } = {}) {
  return (
    <div className="space-y-4" aria-busy>
      {embedded ? null : (
        <div className="space-y-2">
          <Skeleton className="h-3 w-12 border-0" />
          <Skeleton className="h-7 w-40 border-0" />
          <Skeleton className="h-4 w-56 border-0" />
        </div>
      )}
      <GoalCapHeroSkeleton />
      <GoalCapStatsSkeleton />
    </div>
  );
}
