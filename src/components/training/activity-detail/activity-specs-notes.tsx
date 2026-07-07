import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { ActivityDetail, ActivitySpec } from './types';

export function ActivitySpecsNotes({
  activity,
  specs,
}: {
  activity: ActivityDetail;
  specs: ActivitySpec[];
}) {
  if (specs.length === 0 && !activity.notes) return null;

  return (
    <section className="grid gap-4 lg:grid-cols-3">
      {specs.length > 0 && (
        <Card className={cn(activity.notes ? 'lg:col-span-2' : 'lg:col-span-3')}>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
              Caractéristiques
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            {specs.map((row) => (
              <div
                key={row.label}
                className="border-border/40 flex justify-between gap-4 border-b py-2 last:border-0 sm:nth-last-2:border-0"
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="text-right font-medium">{row.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
      {activity.notes && (
        <Card className={cn(specs.length === 0 && 'lg:col-span-3')}>
          <CardHeader>
            <CardTitle className="text-muted-foreground text-sm font-medium tracking-wider uppercase">
              Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-foreground/80 text-sm leading-relaxed whitespace-pre-wrap">
              {activity.notes}
            </p>
          </CardContent>
        </Card>
      )}
    </section>
  );
}
