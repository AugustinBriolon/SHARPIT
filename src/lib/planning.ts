import { ActivityType } from '@prisma/client';
import {
  addWeeks,
  differenceInCalendarWeeks,
  eachWeekOfInterval,
  endOfWeek,
  format,
  isWithinInterval,
  startOfWeek,
} from 'date-fns';
import { estimateActivityLoad } from '@/lib/analytics';
import type { ClientActivity, ClientPlannedSession } from '@/lib/query/types';

const WEEK_OPTS = { weekStartsOn: 1 as const };

const PLANNED_LOAD_FACTOR: Record<ActivityType, number> = {
  RUN: 1.0,
  BIKE: 0.85,
  SWIM: 1.1,
  STRENGTH: 0.7,
};

export function estimatePlannedLoad(session: {
  type: ActivityType;
  load: number | null;
  durationMin: number | null;
}): number {
  if (session.load != null && session.load > 0) return session.load;
  if (!session.durationMin) return 0;
  return Math.round(session.durationMin * PLANNED_LOAD_FACTOR[session.type]);
}

export interface PlanningWeek {
  start: Date;
  end: Date;
  index: number; // 0 = semaine courante
  weeksToRace: number | null;
  planned: ClientPlannedSession[];
  activities: ClientActivity[];
  plannedLoad: number;
  actualLoad: number;
  plannedDurationMin: number;
}

/**
 * Construit la liste des semaines depuis la semaine courante jusqu'à la
 * semaine de la course (ou minWeeks semaines au minimum), avec pour chacune
 * la charge prévue (séances planifiées) et la charge réalisée (activités).
 */
export function buildPlanningWeeks(
  activities: ClientActivity[],
  planned: ClientPlannedSession[],
  raceDate: Date | null,
  options?: { minWeeks?: number },
): PlanningWeek[] {
  const minWeeks = options?.minWeeks ?? 8;
  const start = startOfWeek(new Date(), WEEK_OPTS);
  let lastWeekStart = startOfWeek(addWeeks(new Date(), minWeeks - 1), WEEK_OPTS);
  if (raceDate) {
    const raceWeek = startOfWeek(raceDate, WEEK_OPTS);
    if (raceWeek > lastWeekStart) lastWeekStart = raceWeek;
  }

  const weekStarts = eachWeekOfInterval({ start, end: lastWeekStart }, WEEK_OPTS);
  const raceWeekStart = raceDate ? startOfWeek(raceDate, WEEK_OPTS) : null;

  return weekStarts.map((ws, index) => {
    const we = endOfWeek(ws, WEEK_OPTS);
    const inWeek = (d: Date) => isWithinInterval(new Date(d), { start: ws, end: we });

    const wkPlanned = planned.filter((p) => inWeek(p.date));
    const wkActivities = activities.filter((a) => inWeek(a.date));
    const plannedLoad = wkPlanned.reduce((sum, p) => sum + estimatePlannedLoad(p), 0);
    const actualLoad = Math.round(
      wkActivities.reduce((sum, a) => sum + estimateActivityLoad(a), 0),
    );
    const plannedDurationMin = wkPlanned.reduce((sum, p) => sum + (p.durationMin ?? 0), 0);
    const weeksToRace = raceWeekStart
      ? differenceInCalendarWeeks(raceWeekStart, ws, WEEK_OPTS)
      : null;

    return {
      start: ws,
      end: we,
      index,
      weeksToRace,
      planned: wkPlanned,
      activities: wkActivities,
      plannedLoad,
      actualLoad,
      plannedDurationMin,
    };
  });
}

/** Données d'une semaine (lundi) : réutilise buildPlanningWeeks ou calcule à la volée. */
export function resolvePlanningWeek(
  weekStart: Date,
  activities: ClientActivity[],
  planned: ClientPlannedSession[],
  raceDate: Date | null,
  builtWeeks?: PlanningWeek[],
): PlanningWeek {
  const key = format(startOfWeek(weekStart, WEEK_OPTS), 'yyyy-MM-dd');
  const existing = builtWeeks?.find((w) => format(w.start, 'yyyy-MM-dd') === key);
  if (existing) return existing;

  const ws = startOfWeek(weekStart, WEEK_OPTS);
  const we = endOfWeek(ws, WEEK_OPTS);
  const inWeek = (d: Date) => isWithinInterval(new Date(d), { start: ws, end: we });
  const wkPlanned = planned.filter((p) => inWeek(p.date));
  const wkActivities = activities.filter((a) => inWeek(a.date));
  const raceWeekStart = raceDate ? startOfWeek(raceDate, WEEK_OPTS) : null;
  const currentWeekStart = startOfWeek(new Date(), WEEK_OPTS);
  const index = differenceInCalendarWeeks(ws, currentWeekStart, WEEK_OPTS);

  return {
    start: ws,
    end: we,
    index,
    weeksToRace: raceWeekStart ? differenceInCalendarWeeks(raceWeekStart, ws, WEEK_OPTS) : null,
    planned: wkPlanned,
    activities: wkActivities,
    plannedLoad: wkPlanned.reduce((sum, p) => sum + estimatePlannedLoad(p), 0),
    actualLoad: Math.round(wkActivities.reduce((sum, a) => sum + estimateActivityLoad(a), 0)),
    plannedDurationMin: wkPlanned.reduce((sum, p) => sum + (p.durationMin ?? 0), 0),
  };
}
