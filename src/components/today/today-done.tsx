'use client';

import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { ClientActivity } from '@/lib/query/types';
import {
  activityTypeColors,
  activityTypeLabels,
  formatDistance,
  formatDuration,
} from '@/lib/format';

export function TodayDoneActivities({
  date,
  activities,
}: {
  date: Date;
  activities: ClientActivity[];
}) {
  if (activities.length === 0) return null;

  const title = isSameDay(date, new Date())
    ? "Réalisé aujourd'hui"
    : `Réalisé le ${format(date, 'EEEE d MMMM', { locale: fr })}`;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-muted-foreground flex items-center justify-between text-base font-medium">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="size-4 text-emerald-600" />
            {title}
          </span>
          <Badge variant="outline">{activities.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {activities.map((activity) => (
          <Link
            key={activity.id}
            className="border-border/60 hover:border-primary/30 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors"
            href={`/training/${activity.id}`}
          >
            <span className="flex min-w-0 items-center gap-3">
              <Badge className={activityTypeColors[activity.type]} variant="outline">
                {activityTypeLabels[activity.type]}
              </Badge>
              <span className="truncate font-medium">
                {activity.title ?? activityTypeLabels[activity.type]}
              </span>
            </span>
            <span className="text-muted-foreground text-sm">
              {formatDuration(activity.duration)}
              {activity.runMetrics?.distanceM != null &&
                ` · ${formatDistance(activity.runMetrics.distanceM)}`}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
