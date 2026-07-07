'use client';

import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  formatAchievementPeriodKey,
  formatGoalDisplayValue,
  parseGoalMetricConfig,
} from '@/lib/goal-metric-config';
import { useGoalAchievements } from '@/hooks/use-data';

export function GoalAchievementsHistory() {
  const query = useGoalAchievements(15);

  if (query.isPending) {
    return (
      <section className="space-y-3">
        <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
          Réalisations récentes
        </h2>
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  if (query.isError || !query.data?.length) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
        Réalisations récentes
      </h2>
      <div className="space-y-2">
        {query.data.map((item) => {
          const config = parseGoalMetricConfig(item.goal.metricKey);
          const periodLabel = formatAchievementPeriodKey(item.periodKey);
          const valueLabel = formatGoalDisplayValue(item.value, item.goal.unit, config);
          return (
            <Card key={item.id}>
              <CardContent className="flex flex-wrap items-start justify-between gap-3 py-4">
                <div className="min-w-0 space-y-1">
                  <p className="flex items-center gap-1.5 font-medium">
                    <Trophy className="text-primary size-3.5 shrink-0" />
                    {item.goal.title}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    {valueLabel}
                    {periodLabel ? ` · ${periodLabel}` : ''}
                    {' · '}
                    {new Intl.DateTimeFormat('fr-FR', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    }).format(new Date(item.achievedAt))}
                    {item.source === 'manual' ? ' · marqué manuellement' : ''}
                  </p>
                </div>
                {item.activity && (
                  <Link
                    className="text-primary shrink-0 text-xs font-medium hover:underline"
                    href={`/training/${item.activity.id}`}
                  >
                    Voir la séance
                  </Link>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </section>
  );
}
