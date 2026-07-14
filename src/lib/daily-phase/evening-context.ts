import { ActivityType } from '@prisma/client';
import { addDays, format, startOfDay } from 'date-fns';
import { parsePlannedStart } from '@/lib/daily-phase/day-context';
import { activityTypeLabels } from '@/lib/format';
import { formatClock, formatDuration } from '@/lib/sleep';
import type { TodayEffortLevel } from '@/lib/today-narrative-context';

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

function effortAdjective(sport: string, level: TodayEffortLevel | null): string {
  const isMasculine = sport === 'Vélo' || sport === 'Triathlon';
  switch (level) {
    case 'high':
      return isMasculine ? 'exigeant' : 'exigeante';
    case 'moderate':
      return isMasculine ? 'modéré' : 'modérée';
    default:
      return isMasculine ? 'léger' : 'légère';
  }
}

function todayBilanHeadline(input: {
  sportLabel: string | null;
  effortLevel: TodayEffortLevel | null;
  completedSessionCount: number;
  tomorrowSession: TomorrowSessionHint | null;
  recoveryStress: boolean;
  sleepDebt: boolean;
}): string {
  const {
    sportLabel,
    effortLevel,
    completedSessionCount,
    tomorrowSession,
    recoveryStress,
    sleepDebt,
  } = input;

  if (completedSessionCount === 0) {
    if (tomorrowSession) {
      const tomorrowSport = tomorrowSession.sportLabel;
      if (tomorrowSession.startHour != null && tomorrowSession.startHour < 9) {
        return `Repos aujourd'hui — ${tomorrowSport} tôt demain`;
      }
      return `Repos aujourd'hui — ${tomorrowSport} au programme demain`;
    }
    return 'Journée de repos — recharge pour demain';
  }

  if (completedSessionCount >= 2) {
    if (recoveryStress || effortLevel === 'high') {
      return 'Double entraînement — sécurise la récup ce soir';
    }
    return 'Double entraînement — le sommeil consolidera tout';
  }

  const sport = sportLabel ?? 'Entraînement';
  const qual = effortAdjective(sport, effortLevel);

  if (recoveryStress && effortLevel === 'high') {
    return `${sport} ${qual} — le sommeil comptera ce soir`;
  }

  if (recoveryStress) {
    return `${sport} ${qual} — récupère bien, le corps en demande`;
  }

  if (sleepDebt && effortLevel !== 'light') {
    return `${sport} ${qual} — repose la dette de sommeil ce soir`;
  }

  if (effortLevel === 'high') {
    return `${sport} ${qual} — protège la récup ce soir`;
  }

  if (effortLevel === 'moderate') {
    if (tomorrowSession) {
      return `${sport} ${qual} — prépare le ${tomorrowSession.sportLabel.toLowerCase()} de demain`;
    }
    return `${sport} ${qual} — le corps digère encore`;
  }

  if (tomorrowSession?.startHour != null && tomorrowSession.startHour < 9) {
    return `${sport} ${qual} — couche-toi tôt pour demain`;
  }

  return `${sport} ${qual} — consolidation en cours`;
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

  if (!tomorrow) return null;

  const sportLabel = activityTypeLabels[tomorrow.type as ActivityType] ?? tomorrow.type;
  const start = parsePlannedStart(tomorrowDay, tomorrow.startTime);

  return {
    sportLabel,
    startTime: tomorrow.startTime ?? null,
    startHour: start?.getHours() ?? null,
  };
}

function resolveTonightBedtime(
  sleep: EveningSleepHints,
  tomorrow: TomorrowSessionHint | null,
  recoveryStress: boolean,
): number | null {
  let bed = sleep.recommendedBedtimeMin ?? sleep.bedtimeTargetMin;

  if (bed == null && tomorrow?.startHour != null) {
    const sessionMin = tomorrow.startHour * 60;
    const raw = sessionMin - sleep.recommendedDurationMin - 20;
    bed = ((raw % 1440) + 1440) % 1440;
  }

  if (bed == null) return null;

  if (recoveryStress) bed = (bed - 30 + 1440) % 1440;
  if (tomorrow?.startHour != null && tomorrow.startHour < 8) {
    bed = (bed - 45 + 1440) % 1440;
  } else if (tomorrow?.startHour != null && tomorrow.startHour < 10) {
    bed = (bed - 20 + 1440) % 1440;
  }

  return bed;
}

function buildTonightFocus(
  sleep: EveningSleepHints,
  tomorrow: TomorrowSessionHint | null,
  recoveryStress: boolean,
  todayHadTraining: boolean,
): string {
  const bedtime = resolveTonightBedtime(sleep, tomorrow, recoveryStress);
  const clock = bedtime != null ? formatClock(bedtime) : null;
  const debt = sleep.debt7Min != null && sleep.debt7Min > 30;

  if (tomorrow && todayHadTraining && clock) {
    const when =
      tomorrow.startTime != null
        ? `séance demain à ${tomorrow.startTime}`
        : `séance demain (${tomorrow.sportLabel})`;
    return `Coucher vers ${clock} — récupérer ce soir, ${when}`;
  }

  if (tomorrow && clock) {
    const when =
      tomorrow.startTime != null
        ? `séance demain à ${tomorrow.startTime}`
        : `séance demain (${tomorrow.sportLabel})`;
    return `Coucher vers ${clock} — ${when}`;
  }

  if (recoveryStress && clock) {
    return `Coucher vers ${clock} pour récupérer de la journée`;
  }

  if (todayHadTraining && clock) {
    return `Coucher vers ${clock} pour consolider l'entraînement`;
  }

  if (debt && sleep.recommendedDurationMin > 0) {
    const duration = formatDuration(sleep.recommendedDurationMin);
    if (clock) {
      return `Coucher vers ${clock} — vise ${duration} de sommeil`;
    }
    return `Vise ${duration} de sommeil ce soir`;
  }

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
    sleepDebt: input.sleep.debt7Min != null && input.sleep.debt7Min > 30,
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
  if (!limitingFactorMessage) return false;
  return /récupération|déficit|fatigue|sommeil/i.test(limitingFactorMessage);
}

export { isRecoveryStress };
