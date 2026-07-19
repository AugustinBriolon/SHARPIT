import Link from 'next/link';
import { Target } from 'lucide-react';
import { useGoals } from '@/hooks/use-data';
import { selectTodayGoals } from '@/lib/today-goals-summary';
import { cn } from '@/lib/utils';

export function TodayGoalsStrip() {
  const { data: goals = [], isLoading } = useGoals();
  const lines = selectTodayGoals(goals);

  if (isLoading || lines.length === 0) return null;

  return (
    <div className="border-t pt-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <p className="text-label flex items-center gap-1.5">
          <Target className="size-3.5" />
          Objectifs
        </p>
        <Link className="text-primary text-[11px] font-medium hover:underline" href="/goals">
          Tout voir
        </Link>
      </div>
      <ul className="space-y-2">
        {lines.map((goal) => (
          <li key={goal.id}>
            <Link
              className="hover:bg-muted/40 block rounded-lg border border-transparent px-2 py-1.5 transition-colors"
              href="/goals"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="min-w-0 text-sm leading-snug font-medium">{goal.title}</p>
                {goal.badge && (
                  <span className="text-primary shrink-0 font-mono text-xs font-semibold tabular-nums">
                    {goal.badge}
                  </span>
                )}
              </div>
              {goal.detail && <p className="text-muted-foreground mt-0.5 text-xs">{goal.detail}</p>}
              {goal.progress != null && (
                <div className="mt-1.5 space-y-1">
                  <div className="bg-muted h-1.5 overflow-hidden rounded-full">
                    <div
                      className="bg-primary h-full rounded-full transition-all"
                      style={{ width: `${goal.progress}%` }}
                    />
                  </div>
                  <p className={cn('text-muted-foreground text-[10px] tabular-nums')}>
                    {goal.progress} %
                  </p>
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
