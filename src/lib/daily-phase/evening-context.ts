import { ActivityType } from '@prisma/client';
import { addDays, format, startOfDay } from 'date-fns';
import { parsePlannedStart } from '@/lib/daily-phase/day-context';
import { activityTypeLabels } from '@/lib/format';
import { formatClock, formatDuration } from '@/lib/sleep/sleep';
import type { TodayEffortLevel } from '@/lib/today/today-narrative-context';
import { dayLoadLabel } from '@/lib/daily-phase/day-load';

export type PlannedSessionEveningRef = {
  date: Date | string;
  type: string;
  startTime?: string | null;
  completed?: boolean;
  activityId?: string | null;
};

export type TomorrowSessionHint = {
  sportLabel: string;
  startTime: string | null;
  startHour: number | null;
};

export type EveningSleepHints = {
  recommendedBedtimeMin: number | null;
  recommendedDurationMin: number;
  debt7Min: number | null;
  hasSleepHistory: boolean;
  bedtimeTargetMin: number | null;
};

export type EndOfDayNarrativeCopy = {
  headline: string;
  focusPriority: string;
};

function restDayBilanHeadline(tomorrowSession: TomorrowSessionHint | null): string {
  if (!tomorrowSession) {
    return 'Journée de repos — recharge pour demain';
  }
  if (tomorrowSession.startHour !== null && tomorrowSession.startHour < 9) {
    return `Repos aujourd'hui — ${tomorrowSession.sportLabel} tôt demain`;
  }
  return `Repos aujourd'hui — ${tomorrowSession.sportLabel} au programme demain`;
}

function multiSessionBilanHeadline(
  effortLevel: TodayEffortLevel | null,
  recoveryStress: boolean,
): string {
  if (recoveryStress || effortLevel === 'high') {
    return 'Double entraînement — sécurise la récup ce soir';
  }
  return 'Double entraînement — le sommeil consolidera tout';
}

function moderateEffortHeadline(
  load: string,
  tomorrowSession: TomorrowSessionHint | null,
): string {
  if (tomorrowSession) {
    return `${load} — prépare le ${tomorrowSession.sportLabel.toLowerCase()} de demain`;
  }
  return `${load} — le corps digère encore`;
}

function recoveryStressBilanHeadline(
  load: string,
  effortLevel: TodayEffortLevel | null,
  recoveryStress: boolean,
): string | null {
  if (recoveryStress && effortLevel === 'high') {
    return `${load} — le sommeil comptera ce soir`;
  }
  if (recoveryStress) {
    return `${load} — récupère bien, le corps en demande`;
  }
  return null;
}

function earlyTomorrowHeadline(load: string, tomorrowSession: TomorrowSessionHint | null): string | null {
  if (tomorrowSession?.startHour !== null && tomorrowSession.startHour < 9) {
    return `${load} — couche-toi tôt pour demain`;
  }
  return null;
}

function singleSessionBilanHeadline(input: {
  effortLevel: TodayEffortLevel | null;
  tomorrowSession: TomorrowSessionHint | null;
  recoveryStress: boolean;
  sleepDebt: boolean;
}): string {
  const load = dayLoadLabel(input.effortLevel, false);
  const { effortLevel, tomorrowSession, sleepDebt } = input;

  const recoveryHeadline = recoveryStressBilanHeadline(load, effortLevel, input.recoveryStress);
  if (recoveryHeadline) {
    return recoveryHeadline;
  }
  if (sleepDebt && effortLevel !== 'light') {
    return `${load} — repose la dette de sommeil ce soir`;
  }
  if (effortLevel === 'high') {
    return `${load} — protège la récup ce soir`;
  }
  if (effortLevel === 'moderate') {
    return moderateEffortHeadline(load, tomorrowSession);
  }
  return earlyTomorrowHeadline(load, tomorrowSession) ?? `${load} — consolidation en cours`;
}

function todayBilanHeadline(input: {
  sportLabel: string | null;
  effortLevel: TodayEffortLevel | null;
  completedSessionCount: number;
  tomorrowSession: TomorrowSessionHint | null;
  recoveryStress: boolean;
  sleepDebt: boolean;
}): string {
  const { effortLevel, completedSessionCount, tomorrowSession, recoveryStress, sleepDebt } = input;

  if (completedSessionCount === 0) {
    return restDayBilanHeadline(tomorrowSession);
  }
  if (completedSessionCount >= 2) {
    return multiSessionBilanHeadline(effortLevel, recoveryStress);
  }
  return singleSessionBilanHeadline({ effortLevel, tomorrowSession, recoveryStress, sleepDebt });
}

export function pickTomorrowSessionHint(
  refDate: Date,
  plannedSessions: PlannedSessionEveningRef[],
): TomorrowSessionHint | null {
  const tomorrowDay = startOfDay(addDays(refDate, 1));
  const tomorrowId = format(tomorrowDay, 'yyyy-MM-dd');
  const [tomorrow] = plannedSessions
    .filter(
      (s) => format(new Date(s.date), 'yyyy-MM-dd') === tomorrowId && !s.completed && !s.activityId,
    )
    .sort((a, b) => {
      const ta = parsePlannedStart(tomorrowDay, a.startTime)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const tb = parsePlannedStart(tomorrowDay, b.startTime)?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });

  if (!tomorrow) {
    return null;
  }

  const sportLabel = activityTypeLabels[tomorrow.type as ActivityType] ?? tomorrow.type;
  const start = parsePlannedStart(tomorrowDay, tomorrow.startTime);

  return {
    sportLabel,
    startTime: tomorrow.startTime ?? null,
    startHour: start?.getHours() ?? null,
  };
}

function initialTonightBedtime(
  sleep: EveningSleepHints,
  tomorrow: TomorrowSessionHint | null,
): number | null {
  const recommended = sleep.recommendedBedtimeMin ?? sleep.bedtimeTargetMin;
  if (recommended !== null) {
    return recommended;
  }
  if (tomorrow?.startHour === null || tomorrow?.startHour === undefined) {
    return null;
  }
  const sessionMin = tomorrow.startHour * 60;
  const raw = sessionMin - sleep.recommendedDurationMin - 20;
  return ((raw % 1440) + 1440) % 1440;
}

function adjustBedtimeForTomorrow(
  bed: number,
  tomorrow: TomorrowSessionHint | null,
): number {
  if (tomorrow?.startHour === null || tomorrow?.startHour === undefined) {
    return bed;
  }
  if (tomorrow.startHour < 8) {
    return (bed - 45 + 1440) % 1440;
  }
  if (tomorrow.startHour < 10) {
    return (bed - 20 + 1440) % 1440;
  }
  return bed;
}

function resolveTonightBedtime(
  sleep: EveningSleepHints,
  tomorrow: TomorrowSessionHint | null,
  recoveryStress: boolean,
): number | null {
  let bed = initialTonightBedtime(sleep, tomorrow);
  if (bed === null) {
    return null;
  }
  if (recoveryStress) {
    bed = (bed - 30 + 1440) % 1440;
  }
  return adjustBedtimeForTomorrow(bed, tomorrow);
}

function tomorrowSessionWhen(tomorrow: TomorrowSessionHint): string {
  if (tomorrow.startTime !== null) {
    return `séance demain à ${tomorrow.startTime}`;
  }
  return `séance demain (${tomorrow.sportLabel})`;
}

function focusWithTomorrowSession(
  tomorrow: TomorrowSessionHint,
  clock: string,
  todayHadTraining: boolean,
): string {
  const when = tomorrowSessionWhen(tomorrow);
  if (todayHadTraining) {
    return `Coucher vers ${clock} — récupérer ce soir, ${when}`;
  }
  return `Coucher vers ${clock} — ${when}`;
}

function focusFromSleepDebt(sleep: EveningSleepHints, clock: string | null): string | null {
  const debt = sleep.debt7Min !== null && sleep.debt7Min > 30;
  if (!debt || sleep.recommendedDurationMin <= 0) {
    return null;
  }
  const duration = formatDuration(sleep.recommendedDurationMin);
  if (clock) {
    return `Coucher vers ${clock} — vise ${duration} de sommeil`;
  }
  return `Vise ${duration} de sommeil ce soir`;
}

function focusWhenClockAvailable(input: {
  clockLabel: string;
  tomorrow: TomorrowSessionHint | null;
  recoveryStress: boolean;
  todayHadTraining: boolean;
}): string | null {
  if (input.tomorrow) {
    return focusWithTomorrowSession(input.tomorrow, input.clockLabel, input.todayHadTraining);
  }
  if (input.recoveryStress) {
    return `Coucher vers ${input.clockLabel} pour récupérer de la journée`;
  }
  if (input.todayHadTraining) {
    return `Coucher vers ${input.clockLabel} pour consolider l'entraînement`;
  }
  return null;
}

function resolveTonightFocus(
  sleep: EveningSleepHints,
  tomorrow: TomorrowSessionHint | null,
  recoveryStress: boolean,
  todayHadTraining: boolean,
): string {
  const bedtime = resolveTonightBedtime(sleep, tomorrow, recoveryStress);
  const clockLabel = bedtime !== null ? formatClock(bedtime) : null;

  if (clockLabel) {
    const clockFocus = focusWhenClockAvailable({
      clockLabel,
      tomorrow,
      recoveryStress,
      todayHadTraining,
    });
    if (clockFocus) {
      return clockFocus;
    }
  }

  return focusFromSleepDebt(sleep, clockLabel) ?? defaultTonightFocus(clockLabel);
}

function buildTonightFocus(
  sleep: EveningSleepHints,
  tomorrow: TomorrowSessionHint | null,
  recoveryStress: boolean,
  todayHadTraining: boolean,
): string {
  return resolveTonightFocus(sleep, tomorrow, recoveryStress, todayHadTraining);
}

function defaultTonightFocus(clock: string | null): string {
  if (clock) {
    return `Coucher vers ${clock} pour préparer demain`;
  }
  return 'Vise ta fenêtre de sommeil ce soir — c’est elle qui prépare demain.';
}

export function buildEndOfDayNarrativeCopy(input: {
  sportLabel: string | null;
  totalTssToday: number | null;
  totalDurationMin: number | null;
  effortLevel: TodayEffortLevel | null;
  completedSessionCount: number;
  tomorrowSession: TomorrowSessionHint | null;
  sleep: EveningSleepHints;
  recoveryStress: boolean;
}): EndOfDayNarrativeCopy {
  const todayHadTraining = input.completedSessionCount > 0;

  const headline = todayBilanHeadline({
    sportLabel: input.sportLabel,
    effortLevel: input.effortLevel,
    completedSessionCount: input.completedSessionCount,
    tomorrowSession: input.tomorrowSession,
    recoveryStress: input.recoveryStress,
    sleepDebt: input.sleep.debt7Min !== null && input.sleep.debt7Min > 30,
  });

  const focusPriority = buildTonightFocus(
    input.sleep,
    input.tomorrowSession,
    input.recoveryStress,
    todayHadTraining,
  );

  return { headline, focusPriority };
}

function isRecoveryStress(limitingFactorMessage?: string | null): boolean {
  if (!limitingFactorMessage) {
    return false;
  }
  return /récupération|déficit|fatigue|sommeil/i.test(limitingFactorMessage);
}

export { isRecoveryStress };
