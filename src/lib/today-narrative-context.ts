import { isSameDay, startOfDay } from 'date-fns';
import { ActivityType } from '@prisma/client';
import type { TodayDaySummary } from '@/lib/today-day-summary';
import { activityTypeLabels } from '@/lib/format';
import type { ClientActivity } from '@/lib/query/types';
import { mapVerdictToDisplay, type OverallVerdict, type VerdictDisplay } from '@/lib/today-mapping';

export type TodayEffortLevel = 'light' | 'moderate' | 'high';

export type TodayEffortSnapshot = {
  sessionCount: number;
  totalTss: number;
  totalDurationSec: number;
  level: TodayEffortLevel;
  /** Sport(s) du jour — ex. « Vélo », « Course + Natation ». */
  sportLabel: string;
};

export type TodayNarrativeInput = {
  verdict: OverallVerdict;
  defaultRationale: string;
  daySummary: TodayDaySummary;
  now?: Date;
  effort?: TodayEffortSnapshot | null;
};

type DayPhase = 'morning' | 'afternoon' | 'evening' | 'night';

const EVENING_HOUR = 18;
const LATE_HOUR = 21;

export function hasCompletedSessionsToday(daySummary: TodayDaySummary): boolean {
  return daySummary.lines.some((line) => line.kind === 'done');
}

export function hasPlannedSessionsToday(daySummary: TodayDaySummary): boolean {
  return daySummary.lines.some((line) => line.kind === 'planned');
}

function getDayPhase(hour: number): DayPhase {
  if (hour >= LATE_HOUR) return 'night';
  if (hour >= EVENING_HOUR) return 'evening';
  if (hour >= 12) return 'afternoon';
  return 'morning';
}

export function classifyTodayEffort(
  sessionCount: number,
  totalTss: number,
  totalDurationSec: number,
): TodayEffortLevel {
  if (sessionCount >= 2 || totalTss >= 65 || totalDurationSec >= 5400) return 'high';
  if (totalTss >= 30 || totalDurationSec >= 2700) return 'moderate';
  return 'light';
}

function formatSportLabel(types: ActivityType[]): string {
  const labels = [...new Set(types.map((t) => activityTypeLabels[t]))];
  if (labels.length === 1) return labels[0]!;
  if (labels.length === 2) return labels.join(' + ');
  return `${types.length} sports`;
}

export function buildTodayEffortSnapshot(
  activities: ClientActivity[],
  ref = new Date(),
): TodayEffortSnapshot | null {
  const todayActs = activities
    .filter((a) => isSameDay(new Date(a.date), startOfDay(ref)))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  if (todayActs.length === 0) return null;

  const totalTss = todayActs.reduce((sum, a) => sum + (a.load ?? 0), 0);
  const totalDurationSec = todayActs.reduce((sum, a) => sum + (a.duration ?? 0), 0);
  const level = classifyTodayEffort(todayActs.length, totalTss, totalDurationSec);

  return {
    sessionCount: todayActs.length,
    totalTss: Math.round(totalTss),
    totalDurationSec,
    level,
    sportLabel: formatSportLabel(todayActs.map((a) => a.type)),
  };
}

function plannedSportLabel(daySummary: TodayDaySummary): string {
  const types = daySummary.lines
    .filter((line) => line.kind === 'planned')
    .map((line) => line.plannedSession?.type)
    .filter((t): t is ActivityType => t != null);
  if (types.length > 0) return formatSportLabel(types);
  return 'Séance';
}

function buildPostSessionMessage(
  verdict: OverallVerdict,
  effort: TodayEffortSnapshot,
  phase: DayPhase,
): string {
  const sport = effort.sportLabel;

  if (phase === 'evening' || phase === 'night') {
    if (effort.level === 'high') {
      return `${sport} fait — journée chargée. Repos ce soir.`;
    }
    if (verdict === 'CAUTION' || verdict === 'RECOVER') {
      return `${sport} fait — repos ce soir, rien d'autre.`;
    }
    if (effort.level === 'moderate') {
      return `${sport} fait — soirée calme.`;
    }
    return `${sport} fait — tranquille ce soir.`;
  }

  if (effort.level === 'high') {
    return `${sport} fait — évite un second bloc aujourd'hui.`;
  }
  if (verdict === 'CAUTION' || verdict === 'RECOVER') {
    return `${sport} fait — pas de volume en plus aujourd'hui.`;
  }
  return `${sport} fait — le reste de la journée reste léger.`;
}

function buildPreSessionMessage(
  verdict: OverallVerdict,
  daySummary: TodayDaySummary,
  phase: DayPhase,
): string {
  const sport = plannedSportLabel(daySummary);

  if (phase === 'night') {
    return `${sport} prévu mais tard — mieux vaut reporter.`;
  }

  if (phase === 'evening') {
    switch (verdict) {
      case 'RECOVER':
        return `${sport} ce soir — très facile ou report.`;
      case 'CAUTION':
        return `${sport} ce soir — adapte ou reporte si besoin.`;
      case 'TRAIN_EASY':
        return `${sport} ce soir — reste en mode facile.`;
      default:
        return `${sport} au programme ce soir.`;
    }
  }

  switch (verdict) {
    case 'RECOVER':
      return `${sport} prévu — facile ou report.`;
    case 'TRAIN_EASY':
      return `${sport} prévu — reste en mode facile.`;
    case 'CAUTION':
      return `${sport} prévu — adapte l'intensité.`;
    case 'TRAIN_SMART':
      return `${sport} prévu — vise la qualité.`;
    case 'TRAIN_HARD':
    case 'RACE_READY':
      return `${sport} prévu — tu peux y aller.`;
    default:
      return `${sport} au programme.`;
  }
}

function buildRestOfDayMessage(
  verdict: OverallVerdict,
  phase: DayPhase,
  defaultRationale: string,
): string {
  if (phase === 'night' || phase === 'evening') {
    if (verdict === 'RECOVER' || verdict === 'CAUTION') {
      return 'Pas de séance — soirée reposante.';
    }
    return 'Journée off — soirée calme.';
  }
  return defaultRationale;
}

/**
 * Message principal du header Today : planning, effort réalisé et moment de la journée.
 */
export function buildContextualTodayMessage(input: TodayNarrativeInput): string {
  const { verdict, defaultRationale, daySummary, effort = null } = input;
  const now = input.now ?? new Date();
  const phase = getDayPhase(now.getHours());

  if (hasCompletedSessionsToday(daySummary) && effort) {
    return buildPostSessionMessage(verdict, effort, phase);
  }

  if (hasPlannedSessionsToday(daySummary)) {
    return buildPreSessionMessage(verdict, daySummary, phase);
  }

  if (phase === 'evening' || phase === 'night') {
    return buildRestOfDayMessage(verdict, phase, defaultRationale);
  }

  return defaultRationale;
}

/** Libellé et couleurs adaptés quand la séance du jour est déjà faite. */
export function mapContextualNarrativeDisplay(
  verdict: OverallVerdict,
  input: Pick<TodayNarrativeInput, 'daySummary' | 'now' | 'effort'>,
): VerdictDisplay {
  const now = input.now ?? new Date();
  const phase = getDayPhase(now.getHours());
  const done = hasCompletedSessionsToday(input.daySummary);

  if (done && input.effort) {
    if (phase === 'evening' || phase === 'night') {
      if (input.effort.level === 'high') {
        return {
          label: 'Journée intense',
          colorClass: 'text-orange-600 dark:text-orange-400',
          bgClass: 'from-orange-500/12 border-orange-500/30',
          dotClass: 'bg-orange-500',
          accentBarClass: 'bg-orange-500/80',
        };
      }
      return {
        label: 'Séance faite',
        colorClass: 'text-emerald-600 dark:text-emerald-400',
        bgClass: 'from-emerald-500/12 border-emerald-500/30',
        dotClass: 'bg-emerald-500',
        accentBarClass: 'bg-emerald-500/80',
      };
    }
  }

  if (
    (phase === 'evening' || phase === 'night') &&
    !done &&
    !hasPlannedSessionsToday(input.daySummary)
  ) {
    return {
      label: 'Fin de journée',
      colorClass: 'text-slate-600 dark:text-slate-400',
      bgClass: 'from-slate-500/10 border-slate-500/25',
      dotClass: 'bg-slate-500',
      accentBarClass: 'bg-slate-500/60',
    };
  }

  return mapVerdictToDisplay(verdict);
}

/** Sous-texte de fraîcheur — court en soirée après séance. */
export function buildNarrativeFreshnessNote(
  computedAt: string,
  daySummary: TodayDaySummary,
  now = new Date(),
): string {
  if (hasCompletedSessionsToday(daySummary) && getDayPhase(now.getHours()) !== 'morning') {
    return 'Conseil du soir';
  }

  const hoursAgo = Math.round((now.getTime() - new Date(computedAt).getTime()) / (1000 * 60 * 60));
  if (hoursAgo < 1) return "Mis à jour à l'instant";
  if (hoursAgo === 1) return 'Mis à jour il y a 1 h';
  if (hoursAgo <= 24) return `Mis à jour il y a ${hoursAgo} h`;
  return 'Basé sur hier';
}
