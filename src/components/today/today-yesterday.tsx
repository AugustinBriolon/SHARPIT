'use client';

import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ClientActivity } from '@/lib/client/types';
import { dayActivities } from '@/lib/day';
import {
  activityTypeColors,
  activityTypeLabels,
  formatDistance,
  formatDuration,
} from '@/lib/format';

export function TodayYesterday({ date, activities }: { date: Date; activities: ClientActivity[] }) {
  const yesterday = subDays(date, 1);
  const items = dayActivities(activities, yesterday);
  if (items.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-muted-foreground text-base font-medium">
          Hier · {format(yesterday, 'EEEE d MMMM', { locale: fr })}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((activity) => (
          <Link
            key={activity.id}
            className="border-border/60 hover:border-primary/30 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors"
            href={`/training/${activity.id}`}
          >
            <div className="flex min-w-0 items-center gap-3">
              <Badge className={activityTypeColors[activity.type]} variant="outline">
                {activityTypeLabels[activity.type]}
              </Badge>
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {activity.title ?? activityTypeLabels[activity.type]}
                </p>
                <p className="text-muted-foreground text-xs">
                  {formatDuration(activity.duration)}
                  {activity.load != null && ` · ${Math.round(activity.load)} TSS`}
                  {activity.rpe != null && ` · RPE ${activity.rpe}/10`}
                  {activity.feeling && ` · ${activity.feeling}`}
                </p>
              </div>
            </div>
            {activity.runMetrics?.distanceM != null && (
              <span className="text-muted-foreground shrink-0 text-sm">
                {formatDistance(activity.runMetrics.distanceM)}
              </span>
            )}
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
