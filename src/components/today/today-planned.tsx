'use client';

import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarClock, CheckCircle2, Layers } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LinkButton } from '@/components/ui/link-button';
import type { ClientPlannedSession } from '@/lib/client/types';
import { groupPlannedSessions } from '@/lib/brick-sessions';
import { activityTypeColors, activityTypeLabels } from '@/lib/format';
import { intensityLabels, formatPlannedDuration } from '@/lib/sessions';
import { cn } from '@/lib/utils';

export function TodayPlannedSessions({
  date,
  sessions,
  hidden = false,
}: {
  date: Date;
  sessions: ClientPlannedSession[];
  hidden?: boolean;
}) {
  if (hidden) return null;
  const daySessions = sessions.filter((s) => isSameDay(new Date(s.date), date));
  const groups = groupPlannedSessions(daySessions);
  const isToday = isSameDay(date, new Date());

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-muted-foreground flex items-center gap-2 text-base font-medium">
          <CalendarClock className="text-primary size-4" />
          {isToday ? 'Séance du jour' : `Prévu le ${format(date, 'EEEE d MMMM', { locale: fr })}`}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {groups.length === 0 ? (
          <div className="space-y-3">
            <p className="text-muted-foreground text-sm">
              {isToday
                ? 'Aucune séance planifiée aujourd&apos;hui.'
                : 'Rien de planifié ce jour-là.'}
            </p>
            <LinkButton href="/seances?tab=planning" size="sm" variant="outline">
              Ouvrir le planning
            </LinkButton>
          </div>
        ) : (
          groups.map((group) =>
            group.kind === 'brick' ? (
              <BrickRow key={group.id} sessions={group.sessions} />
            ) : (
              <SessionRow key={group.session.id} session={group.session} />
            ),
          )
        )}
      </CardContent>
    </Card>
  );
}

function SessionRow({ session }: { session: ClientPlannedSession }) {
  const done = session.completed || Boolean(session.activityId);
  return (
    <div
      className={cn(
        'border-border/60 flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3',
        done && 'border-emerald-500/30 bg-emerald-500/5',
      )}
    >
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge className={activityTypeColors[session.type]} variant="outline">
            {activityTypeLabels[session.type]}
          </Badge>
          {session.intensity && (
            <span className="text-muted-foreground text-xs">
              {intensityLabels[session.intensity]}
            </span>
          )}
          {done && <CheckCircle2 className="size-4 text-emerald-600" />}
        </div>
        <p className="font-medium">{session.title ?? activityTypeLabels[session.type]}</p>
        {session.description && (
          <p className="text-muted-foreground line-clamp-2 text-xs">{session.description}</p>
        )}
      </div>
      <div className="text-muted-foreground shrink-0 text-right text-sm">
        {formatPlannedDuration(session.durationMin)}
        {session.load != null && (
          <p className="text-primary font-mono text-xs">{Math.round(session.load)} TSS</p>
        )}
      </div>
    </div>
  );
}

function BrickRow({ sessions }: { sessions: ClientPlannedSession[] }) {
  const allDone = sessions.every((s) => s.completed || s.activityId);
  const totalMin = sessions.reduce((sum, s) => sum + (s.durationMin ?? 0), 0);
  return (
    <div
      className={cn(
        'border-border/60 space-y-2 rounded-xl border px-4 py-3',
        allDone && 'border-emerald-500/30 bg-emerald-500/5',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-muted-foreground flex items-center gap-1.5 text-xs font-medium">
          <Layers className="size-3.5" />
          Brick
        </span>
        <span className="text-muted-foreground text-xs">{formatPlannedDuration(totalMin)}</span>
      </div>
      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        {sessions.map((s, i) => (
          <span key={s.id} className="flex items-center gap-1.5">
            {i > 0 && <span className="text-muted-foreground">→</span>}
            <Badge className={activityTypeColors[s.type]} variant="outline">
              {activityTypeLabels[s.type]}
            </Badge>
          </span>
        ))}
      </div>
      <Link
        className="text-primary text-xs font-medium hover:underline"
        href="/seances?tab=planning"
      >
        Voir dans le planning
      </Link>
    </div>
  );
}
