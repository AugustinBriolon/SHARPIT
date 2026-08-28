import { addDays, differenceInCalendarDays, startOfDay } from 'date-fns';
import type { MacroWeekDraft } from '@/lib/training/periodization';
import type { TravelDiscipline } from '@/lib/travel-context/disciplines';
import {
  formatAllowedDisciplinesPromptRule,
  travelDisciplineLabels,
} from '@/lib/travel-context/disciplines';

/** How much structured training is realistic during a travel window. */
export type TravelTrainingConstraint = 'FULL' | 'REDUCED' | 'MOBILITY_ONLY' | 'NONE';

export type TravelConstraintWindow = {
  startDate: Date;
  endDate: Date;
  label?: string | null;
  trainingConstraint: TravelTrainingConstraint;
  allowedDisciplines?: readonly TravelDiscipline[];
};

export const TRAVEL_TRAINING_CONSTRAINT_LABELS: Record<TravelTrainingConstraint, string> = {
  FULL: 'Entraînement normal',
  REDUCED: 'Entraînement réduit',
  MOBILITY_ONLY: 'Mobilité / étirements uniquement',
  NONE: 'Pas d’entraînement structuré',
};

const CONSTRAINT_RANK: Record<TravelTrainingConstraint, number> = {
  FULL: 0,
  REDUCED: 1,
  MOBILITY_ONLY: 2,
  NONE: 3,
};

/** Apply macro overlay when travel covers at least this many days of the week. */
export const MIN_OVERLAP_DAYS_FOR_MACRO = 3;

const MOBILITY_ONLY_CAP_TSS = 60;
const NONE_CAP_TSS = 25;

export function isTravelTrainingConstraint(value: unknown): value is TravelTrainingConstraint {
  return value === 'FULL' || value === 'REDUCED' || value === 'MOBILITY_ONLY' || value === 'NONE';
}

export function travelTrainingConstraintLabel(value: unknown): string | null {
  if (!isTravelTrainingConstraint(value)) {
    return null;
  }
  return TRAVEL_TRAINING_CONSTRAINT_LABELS[value];
}

function dayOnly(date: Date): Date {
  return startOfDay(date);
}

/** Inclusive calendar-day overlap between [aStart, aEnd] and [bStart, bEnd]. */
export function overlappingCalendarDays(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date,
): number {
  const start = dayOnly(aStart) > dayOnly(bStart) ? dayOnly(aStart) : dayOnly(bStart);
  const end = dayOnly(aEnd) < dayOnly(bEnd) ? dayOnly(aEnd) : dayOnly(bEnd);
  if (end < start) {
    return 0;
  }
  return differenceInCalendarDays(end, start) + 1;
}

export function resolveConstraintForWeek(
  weekStart: Date,
  travels: readonly TravelConstraintWindow[],
  minOverlapDays = MIN_OVERLAP_DAYS_FOR_MACRO,
): { constraint: TravelTrainingConstraint; travel: TravelConstraintWindow } | null {
  const weekEnd = addDays(dayOnly(weekStart), 6);
  let best: { constraint: TravelTrainingConstraint; travel: TravelConstraintWindow } | null = null;

  for (const travel of travels) {
    if (travel.trainingConstraint === 'FULL') {
      continue;
    }
    const overlap = overlappingCalendarDays(weekStart, weekEnd, travel.startDate, travel.endDate);
    if (overlap < minOverlapDays) {
      continue;
    }

    if (!best || CONSTRAINT_RANK[travel.trainingConstraint] > CONSTRAINT_RANK[best.constraint]) {
      best = { constraint: travel.trainingConstraint, travel };
    }
  }

  return best;
}

function constraintFocusLabel(
  constraint: TravelTrainingConstraint,
  suffix: string,
): string {
  const labels: Partial<Record<TravelTrainingConstraint, string>> = {
    REDUCED: `Voyage — charge réduite${suffix}`,
    MOBILITY_ONLY: `Voyage — mobilité et étirements uniquement${suffix}`,
    NONE: `Voyage — pas d’entraînement structuré${suffix}`,
  };
  return labels[constraint] ?? `Voyage${suffix}`;
}

function focusForConstraint(
  constraint: TravelTrainingConstraint,
  travel: Pick<TravelConstraintWindow, 'label' | 'allowedDisciplines'>,
): string {
  const suffix = travel.label?.trim() ? ` (${travel.label.trim()})` : '';
  const disciplines = travel.allowedDisciplines ?? [];
  if (disciplines.length > 0 && constraint !== 'NONE') {
    const labels = travelDisciplineLabels(disciplines).join(', ');
    return `Voyage — ${labels}${suffix}`;
  }
  return constraintFocusLabel(constraint, suffix);
}

function applyConstraintToWeek(
  week: MacroWeekDraft,
  constraint: TravelTrainingConstraint,
  travel: TravelConstraintWindow,
): MacroWeekDraft {
  if (constraint === 'FULL') {
    return week;
  }

  const { targetLoad: currentLoad } = week;
  let targetLoad = currentLoad;

  if (constraint === 'REDUCED') {
    targetLoad = Math.max(40, Math.round(currentLoad * 0.72));
  } else if (constraint === 'MOBILITY_ONLY') {
    targetLoad = Math.min(currentLoad, MOBILITY_ONLY_CAP_TSS);
  } else if (constraint === 'NONE') {
    targetLoad = Math.min(currentLoad, NONE_CAP_TSS);
  }

  return {
    ...week,
    targetLoad,
    targetHours: Number((targetLoad / 55).toFixed(1)),
    isDeload: true,
    focus: focusForConstraint(constraint, travel),
  };
}

/** Overlay travel training constraints onto a deterministic macro-plan draft. */
export function applyTravelConstraintsToMacroWeeks(
  weeks: MacroWeekDraft[],
  travels: readonly TravelConstraintWindow[],
): MacroWeekDraft[] {
  if (travels.length === 0) {
    return weeks;
  }

  return weeks.map((week) => {
    const resolved = resolveConstraintForWeek(week.weekStart, travels);
    if (!resolved) {
      return week;
    }
    return applyConstraintToWeek(week, resolved.constraint, resolved.travel);
  });
}

/**
 * Resolve effective weekly target for coach plan fill, preferring live travel
 * constraints over a stale macro target when a trip covers the block.
 */
type DominantTravelMatch = {
  strongest: TravelTrainingConstraint;
  matched: TravelConstraintWindow;
  overlapDays: number;
};

function findDominantTravelMatch(
  startDate: Date,
  endDate: Date,
  travels: readonly TravelConstraintWindow[],
): DominantTravelMatch | null {
  let strongest: TravelTrainingConstraint = 'FULL';
  let matched: TravelConstraintWindow | null = null;
  let overlapDays = 0;

  for (const travel of travels) {
    const overlap = overlappingCalendarDays(startDate, endDate, travel.startDate, travel.endDate);
    if (overlap === 0) {
      continue;
    }
    if (
      !matched ||
      CONSTRAINT_RANK[travel.trainingConstraint] > CONSTRAINT_RANK[strongest] ||
      (travel.trainingConstraint === strongest && overlap > overlapDays)
    ) {
      strongest = travel.trainingConstraint;
      matched = travel;
      overlapDays = overlap;
    }
  }

  return matched ? { strongest, matched, overlapDays } : null;
}

function capLoadForConstraint(baseLoad: number, constraint: TravelTrainingConstraint): number {
  if (constraint === 'NONE') {
    return Math.min(baseLoad, NONE_CAP_TSS);
  }
  if (constraint === 'MOBILITY_ONLY') {
    return Math.min(baseLoad, MOBILITY_ONLY_CAP_TSS);
  }
  if (constraint === 'REDUCED') {
    return Math.max(40, Math.round(baseLoad * 0.72));
  }
  return baseLoad;
}

function asNull<T>(value: T | null | undefined): T | null {
  return value ?? null;
}

function unconstrainedTravelResult(params: {
  targetLoad: number | null | undefined;
  planFocus: string | null | undefined;
}) {
  return {
    targetLoad: asNull(params.targetLoad),
    planFocus: asNull(params.planFocus),
    constraint: null,
    allowedDisciplines: [] as TravelDiscipline[],
  };
}

export function resolvePlanTargetUnderTravel(params: {
  startDate: Date;
  days: number;
  targetLoad: number | null | undefined;
  planFocus: string | null | undefined;
  travels: readonly TravelConstraintWindow[];
}): {
  targetLoad: number | null;
  planFocus: string | null;
  constraint: TravelTrainingConstraint | null;
  allowedDisciplines: TravelDiscipline[];
} {
  const { startDate, days, travels } = params;
  const endDate = addDays(dayOnly(startDate), Math.max(0, days - 1));
  const dominant = findDominantTravelMatch(startDate, endDate, travels);
  const minOverlap = Math.min(MIN_OVERLAP_DAYS_FOR_MACRO, days);

  if (!dominant || dominant.overlapDays < minOverlap) {
    return unconstrainedTravelResult(params);
  }

  const { strongest, matched } = dominant;
  const allowedDisciplines = [...(matched.allowedDisciplines ?? [])];

  if (strongest === 'FULL') {
    return {
      targetLoad: asNull(params.targetLoad),
      planFocus:
        allowedDisciplines.length > 0
          ? focusForConstraint('FULL', matched)
          : asNull(params.planFocus),
      constraint: null,
      allowedDisciplines,
    };
  }

  const baseLoad = params.targetLoad ?? 200;
  return {
    targetLoad: capLoadForConstraint(baseLoad, strongest),
    planFocus: focusForConstraint(strongest, matched),
    constraint: strongest,
    allowedDisciplines,
  };
}

export function formatTravelConstraintPromptRule(
  constraint: TravelTrainingConstraint | null,
  allowedDisciplines: readonly TravelDiscipline[] = [],
): string {
  const disciplineRule = formatAllowedDisciplinesPromptRule(allowedDisciplines);
  let constraintRule = '';
  switch (constraint) {
    case 'MOBILITY_ONLY':
      constraintRule =
        'CONTRAINTE VOYAGE MOBILITY_ONLY : ne propose AUCUNE séance d’endurance structurée (course, vélo, natation, renfo lourd). Uniquement mobilité, étirements, activation très courte. Respecte strictement la charge cible plafonnée.';
      break;
    case 'NONE':
      constraintRule =
        'CONTRAINTE VOYAGE NONE : ne propose aucune séance structurée. Repos / récupération passive uniquement.';
      break;
    case 'REDUCED':
      constraintRule =
        'CONTRAINTE VOYAGE REDUCED : volume et intensité réduits, séances courtes et faciles, pas de qualité haute.';
      break;
    default:
      break;
  }
  return [constraintRule, disciplineRule].filter(Boolean).join('\n');
}
