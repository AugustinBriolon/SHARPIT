'use client';

import Link from 'next/link';
import { CalendarRange, ClipboardList, Target } from 'lucide-react';
import { isAfter, startOfDay } from 'date-fns';
import { useAthleteSnapshot } from '@/hooks/use-athlete-snapshot';
import { useGoals, usePlannedSessions } from '@/hooks/use-data';
import { selectTodayGoals } from '@/lib/today/today-goals-summary';
import { gateUpcomingSessionsForVerdict } from '@/lib/plan/intensity-gate';
import { resolvePlannedSessionDisplay } from '@/lib/planned-session/display/planned-session-display';
import { plannedSessionHref } from '@/lib/planned-session/display/session-analysis-display';
import {
  mapFatigueToSignal,
  mapVerdictToDisplay,
  type FatigueLevel,
  type FatigueTrajectory,
  type OverallVerdict,
} from '@/lib/today/today-mapping';
import type { ClientPlannedSession } from '@/lib/query/types';
import type { AthleteSnapshot } from '@/core/athlete-state/snapshot';
import { cn } from '@/lib/utils';

const UPCOMING_LIMIT = 5;

function upcomingSessions(sessions: ClientPlannedSession[], now: Date): ClientPlannedSession[] {
  const today = startOfDay(now);
  return sessions
    .filter((s) => !s.completed && !s.activityId)
    .filter((s) => {
      const d = s.date instanceof Date ? s.date : new Date(s.date);
      return (
        !Number.isNaN(d.getTime()) &&
        (isAfter(d, today) || startOfDay(d).getTime() === today.getTime())
      );
    })
    .sort((a, b) => {
      const da = a.date instanceof Date ? a.date : new Date(a.date);
      const db = b.date instanceof Date ? b.date : new Date(b.date);
      return da.getTime() - db.getTime();
    })
    .slice(0, UPCOMING_LIMIT * 2);
}

function resolveVerdict(snapshot: AthleteSnapshot | null): OverallVerdict | null {
  if (!snapshot) {
    return null;
  }
  if (snapshot.todaysDecision) {
    return snapshot.todaysDecision as OverallVerdict;
  }
  if (snapshot.decision?.overallVerdict) {
    return snapshot.decision.overallVerdict as OverallVerdict;
  }
  return null;
}

function GoalProgressBar({ progress }: { progress: number }) {
  return (
    <div
      aria-label={`Progression ${progress}%`}
      aria-valuemax={100}
      aria-valuemin={0}
      aria-valuenow={progress}
      className="bg-muted h-1.5 overflow-hidden rounded-full"
      role="progressbar"
    >
      <div
        className="bg-primary h-full rounded-full transition-[width]"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}

function GoalCard({
  badge,
  detail,
  progress,
  title,
}: {
  badge: string | null;
  detail: string | null;
  progress: number | null;
  title: string;
}) {
  return (
    <div className="analysis-panel rounded-analysis-lg space-y-2 p-4">
      <div className="flex items-start gap-3">
        <div className="icon-well size-9 shrink-0" aria-hidden>
          <Target className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{title}</p>
          <p className="text-muted-foreground mt-0.5 text-sm">
            {[badge, detail].filter(Boolean).join(' · ') || 'En cours'}
          </p>
        </div>
      </div>
      {progress !== null && progress !== undefined ? <GoalProgressBar progress={progress} /> : null}
    </div>
  );
}

function PlanObjectifWidget() {
  const goalsQuery = useGoals();
  const [goal] = selectTodayGoals(goalsQuery.data ?? [], 1);
  const pending = goalsQuery.isPending && !goalsQuery.data;

  return (
    <section aria-labelledby="plan-objectif" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-section-title" id="plan-objectif">
          Objectif
        </h2>
        <Link
          className="text-muted-foreground hover:text-foreground text-xs font-medium"
          href="/progress?tab=goals"
        >
          Voir tout
        </Link>
      </div>
      {pending ? (
        <div className="analysis-panel-alt rounded-analysis-lg h-20 animate-pulse" aria-busy />
      ) : null}
      {!pending && goal ? (
        <GoalCard
          badge={goal.badge}
          detail={goal.detail}
          progress={goal.progress}
          title={goal.title}
        />
      ) : null}
      {!pending && !goal ? (
        <div className="analysis-panel-alt rounded-analysis-lg space-y-2 p-4">
          <p className="text-sm">Aucun objectif actif.</p>
          <Link className="text-primary text-sm font-medium" href="/progress?tab=goals">
            Définir un objectif
          </Link>
        </div>
      ) : null}
    </section>
  );
}

function UpcomingSessionRow({ now, session }: { now: Date; session: ClientPlannedSession }) {
  const display = resolvePlannedSessionDisplay(session, now);
  return (
    <li>
      <Link
        href={plannedSessionHref(session.id)}
        className={cn(
          'analysis-panel rounded-analysis-lg flex items-center gap-3 px-3 py-2.5',
          'hover:border-primary/25 focus-visible:ring-primary/35 focus-visible:ring-2 focus-visible:outline-hidden',
        )}
      >
        <span
          className={cn(
            'text-data shrink-0 rounded-md px-2 py-1 text-[10px] font-medium tracking-wide uppercase',
            display.typeColor,
          )}
        >
          {display.typeLabel}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{display.title}</p>
          <p className="text-muted-foreground text-xs">
            {display.dateStr}
            {display.intensityLabel ? ` · ${display.intensityLabel}` : null}
          </p>
        </div>
      </Link>
    </li>
  );
}

function UpcomingEmpty({
  gateActive,
  withheldCount,
}: {
  gateActive: boolean;
  withheldCount: number;
}) {
  const message =
    gateActive && withheldCount > 0
      ? 'Aucune séance douce sur l’horizon proche — les intensités dures restent en pause.'
      : 'Pas encore de séances planifiées sur l’horizon proche.';
  return (
    <div className="analysis-panel-alt rounded-analysis-lg space-y-2 p-4">
      <p className="text-sm">{message}</p>
      <Link className="text-primary text-sm font-medium" href="/training/planning">
        Ouvrir la planification
      </Link>
    </div>
  );
}

function GateNotice({
  verdict,
  withheldCount,
}: {
  verdict: OverallVerdict;
  withheldCount: number;
}) {
  return (
    <p className="text-muted-foreground text-xs leading-relaxed">
      Verdict Today{' '}
      <span className="text-foreground font-medium">{mapVerdictToDisplay(verdict).label}</span>
      {' — '}
      intensités dures (tempo, seuil, VO2, course) non proposées.
      {withheldCount > 0 ? ` ${withheldCount} séance(s) filtrée(s).` : null}
    </p>
  );
}

function UpcomingBody({
  gateActive,
  now,
  pending,
  proposed,
  withheldCount,
}: {
  gateActive: boolean;
  now: Date;
  pending: boolean;
  proposed: ClientPlannedSession[];
  withheldCount: number;
}) {
  if (pending) {
    return (
      <ul className="space-y-2" aria-busy>
        {Array.from({ length: 3 }).map((_, i) => (
          <li key={i} className="analysis-panel-alt rounded-analysis-lg h-16 animate-pulse" />
        ))}
      </ul>
    );
  }
  if (proposed.length > 0) {
    return (
      <ul className="space-y-2">
        {proposed.map((session) => (
          <UpcomingSessionRow key={session.id} now={now} session={session} />
        ))}
      </ul>
    );
  }
  return <UpcomingEmpty gateActive={gateActive} withheldCount={withheldCount} />;
}

function PlanUpcomingWidget({ verdict }: { verdict: OverallVerdict | null }) {
  const plannedQuery = usePlannedSessions();
  const now = new Date();
  const candidates = upcomingSessions(plannedQuery.data ?? [], now);
  const gated = gateUpcomingSessionsForVerdict(candidates, verdict);
  const proposed = gated.proposed.slice(0, UPCOMING_LIMIT);
  const pending = plannedQuery.isPending && !plannedQuery.data;

  return (
    <section aria-labelledby="plan-upcoming" className="space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-section-title" id="plan-upcoming">
          Prochaines séances
        </h2>
        <Link
          className="text-muted-foreground hover:text-foreground text-xs font-medium"
          href="/training/planning"
        >
          Planifier
        </Link>
      </div>
      {gated.gateActive && verdict ? (
        <GateNotice verdict={verdict} withheldCount={gated.withheld.length} />
      ) : null}
      <UpcomingBody
        gateActive={gated.gateActive}
        now={now}
        pending={pending}
        proposed={proposed}
        withheldCount={gated.withheld.length}
      />
    </section>
  );
}

function LoadRecoveryStats({
  fatigueLabel,
  readiness,
  verdict,
}: {
  fatigueLabel: string | null;
  readiness: number | null;
  verdict: OverallVerdict | null;
}) {
  const verdictDisplay = verdict ? mapVerdictToDisplay(verdict) : null;
  const readinessText = readiness !== null ? String(Math.round(readiness)) : '—';

  return (
    <div className="analysis-panel rounded-analysis-lg grid grid-cols-3 gap-3 p-4">
      <div>
        <p className="text-label">Récup</p>
        <p className="text-data mt-1 text-lg font-medium tabular-nums">{readinessText}</p>
      </div>
      <div>
        <p className="text-label">Fatigue</p>
        <p className="mt-1 text-sm font-medium">{fatigueLabel ?? '—'}</p>
      </div>
      <div>
        <p className="text-label">Verdict</p>
        <p
          className={cn(
            'mt-1 text-sm font-medium',
            verdictDisplay?.colorClass ?? 'text-muted-foreground',
          )}
        >
          {verdictDisplay?.label ?? '—'}
        </p>
      </div>
    </div>
  );
}

function PlanLoadRecoveryWidget({
  fatigueLabel,
  loading,
  readiness,
  verdict,
}: {
  fatigueLabel: string | null;
  loading: boolean;
  readiness: number | null;
  verdict: OverallVerdict | null;
}) {
  return (
    <section aria-labelledby="plan-load-recovery" className="space-y-3">
      <h2 className="text-section-title" id="plan-load-recovery">
        Charge / récup
      </h2>
      {loading ? (
        <div className="analysis-panel-alt rounded-analysis-lg h-24 animate-pulse" aria-busy />
      ) : (
        <LoadRecoveryStats fatigueLabel={fatigueLabel} readiness={readiness} verdict={verdict} />
      )}
    </section>
  );
}

/**
 * Plan hub widgets — Objectif, prochaines (gated), charge/récup.
 * Secondary tools (planification, bilan) stay quiet links — no Accès dump.
 * Fil de la semaine / Séjours are deprioritized out of the primary Plan path.
 */
export function PlanHubWidgets() {
  const { loading, snapshot } = useAthleteSnapshot();
  const verdict = resolveVerdict(snapshot);
  const readiness = snapshot?.readiness ?? null;
  const fatigue = snapshot?.fatigue;
  const fatigueLabel = fatigue
    ? mapFatigueToSignal(
        fatigue.fatigueLevel as FatigueLevel,
        (fatigue.trajectory ?? 'STABLE') as FatigueTrajectory,
      ).label
    : null;

  return (
    <div className="space-y-6">
      <PlanObjectifWidget />
      <PlanUpcomingWidget verdict={verdict} />
      <PlanLoadRecoveryWidget
        fatigueLabel={fatigueLabel}
        loading={loading && !snapshot}
        readiness={readiness}
        verdict={verdict}
      />

      <nav aria-label="Outils plan" className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
        <Link
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          href="/training/planning"
        >
          <CalendarRange className="size-3.5" aria-hidden />
          Planification
        </Link>
        <Link
          className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm"
          href="/training/weekly-review"
        >
          <ClipboardList className="size-3.5" aria-hidden />
          Bilan hebdo
        </Link>
      </nav>
    </div>
  );
}
