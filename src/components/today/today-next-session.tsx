'use client';

import { format, isSameDay, startOfDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarClock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import type { ClientPlannedSession } from '@/lib/client/types';
import { groupPlannedSessions } from '@/lib/brick-sessions';
import { activityTypeColors, activityTypeLabels } from '@/lib/format';
import { intensityLabels, formatPlannedDuration } from '@/lib/sessions';

export function TodayNextSession({
  date,
  sessions,
}: {
  date: Date;
  sessions: ClientPlannedSession[];
}) {
  const refDay = startOfDay(date);

  const upcoming = sessions
    .filter((s) => !s.completed && !s.activityId)
    .filter((s) => startOfDay(new Date(s.date)).getTime() >= refDay.getTime())
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const [next] = upcoming;
  if (!next) return null;

  const nextDate = new Date(next.date);
  const today = startOfDay(new Date());
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dateLabel = upcomingDateLabel(nextDate, today, tomorrow);

  const groups = groupPlannedSessions([next]);
  const [group] = groups;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
          <CalendarClock className="text-primary size-4" />
          Prochaine séance · {dateLabel}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {group?.kind === 'brick' ? (
          <div className="border-border/60 space-y-2 rounded-xl border px-4 py-3">
            <Badge variant="outline">Brick</Badge>
            {group.sessions.map((s) => (
              <p key={s.id} className="text-sm font-medium">
                {activityTypeLabels[s.type]} — {s.title ?? 'Séance'}
              </p>
            ))}
          </div>
        ) : (
          <div className="border-border/60 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3">
            <div className="space-y-1">
              <Badge className={activityTypeColors[next.type]} variant="outline">
                {activityTypeLabels[next.type]}
              </Badge>
              <p className="font-medium">{next.title ?? activityTypeLabels[next.type]}</p>
              {next.intensity && (
                <p className="text-muted-foreground text-xs">{intensityLabels[next.intensity]}</p>
              )}
            </div>
            <div className="text-muted-foreground text-right text-sm">
              {formatPlannedDuration(next.durationMin)}
              {next.load != null && (
                <p className="text-primary font-mono text-xs">{Math.round(next.load)} TSS</p>
              )}
            </div>
          </div>
        )}
        <LinkButton href="/seances?tab=planning" size="sm" variant="outline">
          Voir le planning
        </LinkButton>
      </CardContent>
    </Card>
  );
}

function upcomingDateLabel(nextDate: Date, today: Date, tomorrow: Date): string {
  if (isSameDay(nextDate, today)) return "Aujourd'hui";
  if (isSameDay(nextDate, tomorrow)) return 'Demain';
  return format(nextDate, 'EEEE d MMMM', { locale: fr });
}
