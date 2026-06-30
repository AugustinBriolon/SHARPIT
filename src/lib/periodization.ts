import type { PlanPhase } from '@prisma/client';
import { addWeeks, differenceInCalendarWeeks, format, startOfDay, startOfWeek } from 'date-fns';

const WEEK_OPTS = { weekStartsOn: 1 as const };

export const phaseLabels: Record<PlanPhase, string> = {
  BASE: 'Base',
  BUILD: 'Développement',
  PEAK: 'Spécifique',
  TAPER: 'Affûtage',
  RACE: 'Course',
};

export const phaseColors: Record<PlanPhase, string> = {
  BASE: '#64748b',
  BUILD: '#0891b2',
  PEAK: '#ea580c',
  TAPER: '#7c3aed',
  RACE: '#dc2626',
};

export interface MacroWeekDraft {
  weekStart: Date;
  weekIndex: number;
  phase: PlanPhase;
  targetLoad: number;
  targetHours: number;
  focus: string;
  isDeload: boolean;
}

export interface MacroPlanDraft {
  raceDate: Date;
  startDate: Date;
  totalWeeks: number;
  baselineCtl: number;
  summary: string;
  weeks: MacroWeekDraft[];
}

interface PhaseBlock {
  phase: PlanPhase;
  weeks: number;
}

/** Répartition des phases selon le nombre de semaines avant la course. */
function distributePhases(totalWeeks: number): PhaseBlock[] {
  if (totalWeeks <= 0) return [{ phase: 'RACE', weeks: 1 }];

  const taperWeeks = totalWeeks <= 6 ? 1 : totalWeeks <= 12 ? 2 : 3;
  const raceWeeks = 1;
  const remaining = Math.max(0, totalWeeks - taperWeeks - raceWeeks);

  if (remaining <= 0) {
    return [
      ...(taperWeeks > 0 ? [{ phase: 'TAPER' as const, weeks: taperWeeks }] : []),
      { phase: 'RACE' as const, weeks: raceWeeks },
    ];
  }

  let baseWeeks: number;
  let buildWeeks: number;
  let peakWeeks: number;

  if (totalWeeks <= 8) {
    baseWeeks = 0;
    buildWeeks = Math.max(1, remaining - 1);
    peakWeeks = Math.max(0, remaining - buildWeeks);
  } else if (totalWeeks <= 16) {
    baseWeeks = Math.max(2, Math.round(remaining * 0.35));
    peakWeeks = Math.max(1, Math.round(remaining * 0.2));
    buildWeeks = remaining - baseWeeks - peakWeeks;
  } else {
    baseWeeks = Math.max(4, Math.round(remaining * 0.45));
    peakWeeks = Math.max(2, Math.round(remaining * 0.15));
    buildWeeks = remaining - baseWeeks - peakWeeks;
  }

  if (buildWeeks < 1) {
    buildWeeks = 1;
    baseWeeks = Math.max(0, baseWeeks - 1);
  }

  const blocks: PhaseBlock[] = [];
  if (baseWeeks > 0) blocks.push({ phase: 'BASE', weeks: baseWeeks });
  if (buildWeeks > 0) blocks.push({ phase: 'BUILD', weeks: buildWeeks });
  if (peakWeeks > 0) blocks.push({ phase: 'PEAK', weeks: peakWeeks });
  blocks.push({ phase: 'TAPER', weeks: taperWeeks });
  blocks.push({ phase: 'RACE', weeks: raceWeeks });
  return blocks;
}

const PHASE_LOAD_FACTOR: Record<PlanPhase, number> = {
  BASE: 0.85,
  BUILD: 1.0,
  PEAK: 1.08,
  TAPER: 0.55,
  RACE: 0.25,
};

const PHASE_FOCUS: Record<PlanPhase, string> = {
  BASE: 'Volume aérobie, endurance fondamentale, renforcement général',
  BUILD: 'Intensité progressive, séances seuil et tempo',
  PEAK: 'Spécificité course, simulation allure/puissance cible',
  TAPER: "Réduction volume, maintien de l'intensité courte",
  RACE: 'Repos actif, activation légère, course',
};

function taperFactor(weekInTaper: number, totalTaper: number): number {
  if (totalTaper <= 1) return 0.55;
  const progress = weekInTaper / totalTaper;
  return 0.7 - progress * 0.35; // 70% → 35%
}

/**
 * Génère un macro-plan périodisé déterministe jusqu'à la date de course.
 * La charge hebdo part de la CTL actuelle (×7 ≈ charge chronique hebdo).
 */
export function generateMacroPlan(params: {
  raceDate: Date;
  startDate?: Date;
  baselineCtl: number;
}): MacroPlanDraft {
  const startDate = startOfWeek(startOfDay(params.startDate ?? new Date()), WEEK_OPTS);
  const raceWeek = startOfWeek(startOfDay(params.raceDate), WEEK_OPTS);
  const totalWeeks = differenceInCalendarWeeks(raceWeek, startDate, WEEK_OPTS) + 1;

  if (totalWeeks < 1) {
    throw new Error('La date de course doit être dans le futur.');
  }

  const baselineCtl = Math.max(15, Math.round(params.baselineCtl));
  const baseWeeklyLoad = Math.round(baselineCtl * 7);
  const phaseBlocks = distributePhases(totalWeeks);

  const weeks: MacroWeekDraft[] = [];
  let weekIndex = 0;
  let taperCounter = 0;
  const taperTotal = phaseBlocks.find((b) => b.phase === 'TAPER')?.weeks ?? 0;
  let buildWeekCounter = 0;

  for (const block of phaseBlocks) {
    for (let i = 0; i < block.weeks; i++) {
      const weekStart = addWeeks(startDate, weekIndex);
      let loadFactor = PHASE_LOAD_FACTOR[block.phase];

      if (block.phase === 'TAPER') {
        taperCounter += 1;
        loadFactor = taperFactor(taperCounter, taperTotal);
      }

      // Deload toutes les 4 semaines en base/build (sauf taper/race).
      const isDeload =
        (block.phase === 'BASE' || block.phase === 'BUILD') &&
        buildWeekCounter > 0 &&
        buildWeekCounter % 4 === 0;

      if (block.phase === 'BASE' || block.phase === 'BUILD') {
        buildWeekCounter += 1;
      }

      const progression =
        block.phase === 'BUILD'
          ? 1 + Math.min(i, 3) * 0.04
          : block.phase === 'BASE'
            ? 1 + Math.min(i, 5) * 0.03
            : 1;

      let targetLoad = Math.round(
        baseWeeklyLoad * loadFactor * progression * (isDeload ? 0.72 : 1),
      );
      targetLoad = Math.max(block.phase === 'RACE' ? 20 : 80, Math.min(900, targetLoad));

      const targetHours = Number((targetLoad / 55).toFixed(1));

      weeks.push({
        weekStart,
        weekIndex,
        phase: block.phase,
        targetLoad,
        targetHours,
        focus: isDeload
          ? 'Semaine de récupération — volume réduit, maintien léger'
          : PHASE_FOCUS[block.phase],
        isDeload,
      });
      weekIndex += 1;
    }
  }

  const phaseSummary = phaseBlocks
    .map((b) => `${b.weeks} sem. ${phaseLabels[b.phase].toLowerCase()}`)
    .join(' → ');

  const summary = `Macro-plan ${totalWeeks} semaines jusqu'au ${format(params.raceDate, 'd/MM/yyyy')} : ${phaseSummary}. Charge de référence CTL ${baselineCtl} (≈${baseWeeklyLoad} TSS/sem).`;

  return {
    raceDate: params.raceDate,
    startDate,
    totalWeeks,
    baselineCtl,
    summary,
    weeks,
  };
}

/** Retrouve la semaine du plan correspondant à une date. */
export function findPlanWeekForDate<T extends { weekStart: Date }>(
  weeks: T[],
  date: Date,
): T | undefined {
  const ws = startOfWeek(startOfDay(date), WEEK_OPTS);
  const key = format(ws, 'yyyy-MM-dd');
  return weeks.find((w) => format(w.weekStart, 'yyyy-MM-dd') === key);
}
