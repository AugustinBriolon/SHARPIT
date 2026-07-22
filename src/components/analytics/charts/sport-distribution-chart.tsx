'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CHART_COLORS, type SportDistribution } from '@/lib/analytics';
import { cn } from '@/lib/utils';

interface SportDistributionChartProps {
  data: SportDistribution[];
  className?: string;
}

export function SportDistributionChart({ data, className }: SportDistributionChartProps) {
  return (
    <Card className={cn('h-full w-full', className)}>
      <CardHeader>
        <CardTitle className="text-base font-medium">Répartition par sport</CardTitle>
        <p className="text-muted-foreground text-xs">90 derniers jours — en heures</p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {data.map((sport) => (
            <div key={sport.type} className="analysis-panel rounded-analysis px-3 py-3">
              <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <span
                    className="size-2.5 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[sport.type] }}
                  />
                  <span className="truncate font-medium">{sport.label}</span>
                </div>
                <div className="text-data text-muted-foreground shrink-0">
                  {sport.hours}h · {sport.percent}%
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="bg-analysis-surface relative h-2 overflow-hidden rounded-full">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${sport.percent}%`,
                      backgroundColor: CHART_COLORS[sport.type],
                    }}
                  />
                  <div className="border-analysis-border/70 absolute inset-0 rounded-full border" />
                </div>
                <p className="text-muted-foreground text-[10px] leading-none">
                  {sport.count} séance{sport.count > 1 ? 's' : ''}
                </p>
              </div>
            </div>
          ))}
          {data.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Aucune répartition disponible sur la période.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
