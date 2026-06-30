'use client';

import { format, isSameDay } from 'date-fns';
import { fr } from 'date-fns/locale';
import { CalendarRange, CheckCircle2, Layers, Plus, Sparkles, Wand2 } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { StickyHeader } from '@/components/layout/sticky-header';
import { PlanAdapter } from '@/components/coach/plan-adapter';
import { PlanGenerator } from '@/components/coach/plan-generator';
import { MacroPlanDialog } from '@/components/planning/macro-plan-dialog';
import { PlannedSessionDialog } from '@/components/planning/planned-session-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { ClientPlannedSession, ClientPlanWeek } from '@/lib/client/types';
import { groupPlannedSessions } from '@/lib/brick-sessions';
import { activityTypeColors, activityTypeLabels } from '@/lib/format';
import { buildPlanningWeeks, type PlanningWeek } from '@/lib/planning';
import { phaseColors, phaseLabels } from '@/lib/periodization';
import { intensityAccent, formatPlannedDuration } from '@/lib/sessions';
import { cn } from '@/lib/utils';
import { useActivities, useGoals, usePlannedSessions, useTrainingPlan } from '@/hooks/use-data';

type DialogState =
  { mode: 'create'; date: Date } | { mode: 'edit'; session: ClientPlannedSession } | null;

export function PlanningView() {
  const activitiesQuery = useActivities();
  const plannedQuery = usePlannedSessions();
  const goalsQuery = useGoals();
  const planQuery = useTrainingPlan();
  const [dialog, setDialog] = useState<DialogState>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [adapterOpen, setAdapterOpen] = useState(false);
  const [macroPlanOpen, setMacroPlanOpen] = useState(false);

  const planWeekByStart = useMemo(() => {
    const map = new Map<string, ClientPlanWeek>();
    const plan = planQuery.data;
    if (!plan?.weeks) return map;
    for (const w of plan.weeks) {
      map.set(format(new Date(w.weekStart), 'yyyy-MM-dd'), w);
    }
    return map;
  }, [planQuery.data]);

  if (activitiesQuery.isLoading || plannedQuery.isLoading || goalsQuery.isLoading) {
    return (
      <div className="space-y-8">
        <Skeleton className="h-9 w-48" />
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-40 w-full" />
        ))}
      </div>
    );
  }

  const [nextRace] = (goalsQuery.data ?? [])
    .flatMap((g) =>
      g.kind === 'RACE' && !g.achieved && g.targetDate != null
        ? [{ goal: g, target: new Date(g.targetDate) }]
        : [],
    )
    .filter(({ target }) => target >= new Date())
    .sort((a, b) => a.target.getTime() - b.target.getTime());

  const weeks = buildPlanningWeeks(
    activitiesQuery.data ?? [],
    plannedQuery.data ?? [],
    nextRace?.target ?? null,
  );

  return (
    <div className="space-y-6">
      <StickyHeader className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-primary text-xs font-medium tracking-[0.2em] uppercase">Planning</p>
          <h1 className="font-heading mt-2 text-3xl font-semibold tracking-tight">
            Plan d&apos;entraînement
          </h1>
          <p className="text-muted-foreground mt-1">
            {nextRace
              ? `Objectif : ${nextRace.goal.title} — ${format(nextRace.target, 'd MMMM yyyy', { locale: fr })}`
              : "Construis tes semaines d'entraînement."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setMacroPlanOpen(true)}>
            <CalendarRange className="size-4" />
            Macro-plan
          </Button>
          <Button variant="outline" onClick={() => setAdapterOpen(true)}>
            <Wand2 className="size-4" />
            Réadapter
          </Button>
          <Button variant="outline" onClick={() => setGeneratorOpen(true)}>
            <Sparkles className="size-4" />
            Générer ma semaine
          </Button>
          <Button onClick={() => setDialog({ mode: 'create', date: new Date() })}>
            <Plus className="size-4" />
            Planifier une séance
          </Button>
        </div>
      </StickyHeader>

      <div className="space-y-4">
        {weeks.map((week) => (
          <WeekCard
            key={week.start.toISOString()}
            planWeek={planWeekByStart.get(format(week.start, 'yyyy-MM-dd'))}
            week={week}
            onAdd={(date) => setDialog({ mode: 'create', date })}
            onEdit={(session) => setDialog({ mode: 'edit', session })}
          />
        ))}
      </div>

      {dialog && (
        <PlannedSessionDialog
          defaultDate={dialog.mode === 'create' ? dialog.date : undefined}
          goals={goalsQuery.data ?? []}
          session={dialog.mode === 'edit' ? dialog.session : undefined}
          onClose={() => setDialog(null)}
        />
      )}

      {generatorOpen && <PlanGenerator onClose={() => setGeneratorOpen(false)} />}

      {adapterOpen && <PlanAdapter onClose={() => setAdapterOpen(false)} />}

      {macroPlanOpen && (
        <MacroPlanDialog goals={goalsQuery.data ?? []} onClose={() => setMacroPlanOpen(false)} />
      )}
    </div>
  );
}

const DAY_LABELS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function PlannedSessionChip({
  session: p,
  onEdit,
}: {
  session: ClientPlannedSession;
  onEdit: (session: ClientPlannedSession) => void;
}) {
  const accent = p.intensity ? intensityAccent[p.intensity] : '#94a3b8';
  const score = (p.analysis as { complianceScore?: number } | null)?.complianceScore;
  return (
    <button
      style={{ borderColor: accent }}
      title={p.description ?? undefined}
      type="button"
      className={cn(
        'hover:bg-muted/40 block w-full truncate rounded-md border border-dashed px-1.5 py-1 text-left text-[11px]',
        p.completed && 'opacity-50',
      )}
      onClick={() => onEdit(p)}
    >
      <span className="flex items-center gap-1">
        {p.completed ? (
          <CheckCircle2 className="size-2.5 shrink-0 text-emerald-600" />
        ) : (
          <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: accent }} />
        )}
        <span className="truncate">{p.title ?? activityTypeLabels[p.type]}</span>
      </span>
      <span className="text-muted-foreground mt-0.5 flex items-center justify-between gap-1 text-[10px]">
        <span>
          {p.startTime ? `${p.startTime} · ` : ''}
          {formatPlannedDuration(p.durationMin)}
        </span>
        {score != null ? (
          <span
            className={cn(
              'font-mono',
              score >= 85 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600',
            )}
          >
            {score}
          </span>
        ) : null}
      </span>
    </button>
  );
}

function WeekCard({
  week,
  planWeek,
  onAdd,
  onEdit,
}: {
  week: PlanningWeek;
  planWeek?: ClientPlanWeek;
  onAdd: (date: Date) => void;
  onEdit: (session: ClientPlannedSession) => void;
}) {
  const isCurrent = week.index === 0;
  const phaseAccent = planWeek ? phaseColors[planWeek.phase] : null;
  const totalSessions = week.planned.length;
  const completedSessions = week.planned.filter((p) => p.completed).length;
  const ratio = totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;
  // Temps restant = durée des séances planifiées non encore réalisées.
  const remainingMin = week.planned
    .filter((p) => !p.completed)
    .reduce((sum, p) => sum + (p.durationMin ?? 0), 0);

  const days = DAY_LABELS.map((label, i) => {
    const date = new Date(week.start);
    date.setDate(date.getDate() + i);
    const planned = week.planned.filter((p) => isSameDay(new Date(p.date), date));
    const activities = week.activities.filter((a) => isSameDay(new Date(a.date), date));
    return { label, date, planned, activities };
  });

  return (
    <Card className={cn(isCurrent && 'border-primary/40')}>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-base font-medium">
            Semaine du {format(week.start, 'd MMM', { locale: fr })}
          </h2>
          {isCurrent && <Badge variant="outline">En cours</Badge>}
          {week.weeksToRace != null && week.weeksToRace >= 0 && (
            <Badge className="text-primary" variant="outline">
              {week.weeksToRace === 0 ? 'Semaine course' : `S-${week.weeksToRace}`}
            </Badge>
          )}
          {planWeek && phaseAccent && (
            <Badge
              variant="outline"
              style={{
                borderColor: `${phaseAccent}55`,
                color: phaseAccent,
              }}
            >
              {phaseLabels[planWeek.phase]}
              {planWeek.isDeload ? ' · deload' : ''}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-3">
          {planWeek && (
            <p className="text-muted-foreground text-xs">
              Cible{' '}
              <span className="text-foreground font-mono font-medium">
                {planWeek.targetLoad} TSS
              </span>
              {week.plannedLoad > 0 && (
                <>
                  {' '}
                  · planifié{' '}
                  <span
                    className={cn(
                      'font-mono font-medium',
                      week.plannedLoad > planWeek.targetLoad * 1.15
                        ? 'text-amber-600'
                        : week.plannedLoad < planWeek.targetLoad * 0.7
                          ? 'text-muted-foreground'
                          : 'text-emerald-600',
                    )}
                  >
                    {Math.round(week.plannedLoad)}
                  </span>
                </>
              )}
            </p>
          )}
          <div className="text-right">
            <p className="text-sm">
              <span className="text-foreground font-medium">
                {completedSessions}/{totalSessions}
              </span>{' '}
              <span className="text-muted-foreground">
                {totalSessions > 1 ? 'séances' : 'séance'}
              </span>
              {remainingMin > 0 && (
                <>
                  <span className="text-muted-foreground mx-1">·</span>
                  <span className="text-muted-foreground">
                    {formatPlannedDuration(remainingMin)} à faire
                  </span>
                </>
              )}
            </p>
            <div className="bg-muted/60 mt-1 h-1.5 w-40 overflow-hidden rounded-full">
              <div
                className="h-full rounded-full bg-emerald-400/80"
                style={{ width: `${ratio}%` }}
              />
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
          {days.map((day) => (
            <div key={day.label} className="border-border/40 bg-card/30 rounded-lg border p-2">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-muted-foreground text-[11px] font-medium tracking-wider uppercase">
                  {day.label} {day.date.getDate()}
                </span>
                <button
                  aria-label="Ajouter une séance"
                  className="text-muted-foreground hover:text-foreground"
                  type="button"
                  onClick={() => onAdd(day.date)}
                >
                  <Plus className="size-3" />
                </button>
              </div>
              <div className="space-y-1">
                {groupPlannedSessions(day.planned).map((item) =>
                  item.kind === 'single' ? (
                    <PlannedSessionChip
                      key={item.session.id}
                      session={item.session}
                      onEdit={onEdit}
                    />
                  ) : (
                    <div
                      key={item.id}
                      className="border-primary/30 bg-primary/5 space-y-1 rounded-md border p-1"
                    >
                      <span className="text-primary flex items-center gap-1 px-0.5 text-[9px] font-medium tracking-wider uppercase">
                        <Layers className="size-2.5" /> Brick
                      </span>
                      {item.sessions.map((s) => (
                        <PlannedSessionChip key={s.id} session={s} onEdit={onEdit} />
                      ))}
                    </div>
                  ),
                )}
                {day.activities.map((a) => (
                  <Link
                    key={a.id}
                    href={`/training/${a.id}`}
                    title={a.title ?? activityTypeLabels[a.type]}
                    className={cn(
                      'border-border/60 bg-card/80 hover:border-primary/40 block truncate rounded-md border px-1.5 py-0.5 text-[11px] font-medium',
                      activityTypeColors[a.type],
                    )}
                  >
                    ✓ {a.title ?? activityTypeLabels[a.type]}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
