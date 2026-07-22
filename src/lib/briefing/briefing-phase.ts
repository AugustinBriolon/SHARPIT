import type { DailyPhase } from '@/lib/daily-phase/types';
import { DAILY_PHASE_BRIEFING_BUCKET } from '@/lib/daily-phase/types';

export type BriefingPhase = 'morning' | 'midday' | 'afternoon' | 'evening';

export function resolveBriefingPhase(refDate: Date): BriefingPhase {
  const hour = refDate.getHours();
  if (hour < 12) return 'morning';
  if (hour < 15) return 'midday';
  if (hour < 19) return 'afternoon';
  return 'evening';
}

/** Map athlete-centric Daily Phase to LLM briefing bucket. */
export function resolveBriefingPhaseFromDailyPhase(dailyPhase: DailyPhase): BriefingPhase {
  return DAILY_PHASE_BRIEFING_BUCKET[dailyPhase];
}

export const BRIEFING_PHASE_LABELS: Record<BriefingPhase, string> = {
  morning: 'bilan du matin',
  midday: 'point de mi-journée',
  afternoon: "bilan de l'après-midi",
  evening: 'bilan de fin de journée',
};

export const BRIEFING_PHASE_EYEBROW: Record<BriefingPhase, string> = {
  morning: 'Bilan du matin',
  midday: 'Point de mi-journée',
  afternoon: "Bilan de l'après-midi",
  evening: 'Bilan de fin de journée',
};

export const DAILY_PHASE_BRIEFING_LABELS: Record<DailyPhase, string> = {
  MORNING: BRIEFING_PHASE_LABELS.morning,
  BEFORE_SESSION: BRIEFING_PHASE_LABELS.midday,
  SESSION_COMPLETED: BRIEFING_PHASE_LABELS.afternoon,
  RECOVERY_WINDOW: BRIEFING_PHASE_LABELS.evening,
  END_OF_DAY: BRIEFING_PHASE_LABELS.evening,
};
