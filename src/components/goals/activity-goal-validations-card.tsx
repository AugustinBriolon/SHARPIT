import Link from 'next/link';
import { Trophy } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import {
  formatAchievementPeriodKey,
  formatGoalDisplayValue,
  parseGoalMetricConfig,
} from '@/lib/goal-metric-config';

export interface ActivityGoalValidation {
  id: string;
  achievedAt: Date | string;
  value: number | null;
  periodKey: string;
  goal: {
    id: string;
    title: string;
    unit: string | null;
    metricKey: string | null;
    targetValue: number | null;
  };
}

interface ActivityGoalValidationsCardProps {
  validations: ActivityGoalValidation[];
}

export function ActivityGoalValidationsCard({ validations }: ActivityGoalValidationsCardProps) {
  if (!validations.length) return null;

  return (
    <Card className="border-primary/25 bg-primary/5">
      <CardContent className="space-y-3 py-5">
        <div className="flex items-center gap-2">
          <Trophy className="text-primary size-4" />
          <h2 className="font-medium">Objectif validé</h2>
        </div>
        <ul className="space-y-2">
          {validations.map((v) => {
            const config = parseGoalMetricConfig(v.goal.metricKey);
            const periodLabel = formatAchievementPeriodKey(v.periodKey);
            const valueLabel = formatGoalDisplayValue(v.value, v.goal.unit, config);
            return (
              <li key={v.id} className="bg-background/70 rounded-lg border p-3 text-sm">
                <Link className="font-medium hover:underline" href="/goals">
                  {v.goal.title}
                </Link>
                <p className="text-muted-foreground mt-1 text-xs">
                  {config?.template === 'performance'
                    ? `Chrono validant : ${valueLabel}`
                    : `Réalisé : ${valueLabel}`}
                  {periodLabel ? ` · ${periodLabel}` : ''}
                  {' · '}
                  {new Intl.DateTimeFormat('fr-FR', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  }).format(new Date(v.achievedAt))}
                </p>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
