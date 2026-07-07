export type BriefingPhase = 'morning' | 'midday' | 'afternoon' | 'evening';

export function resolveBriefingPhase(refDate: Date): BriefingPhase {
  const hour = refDate.getHours();
  if (hour < 12) return 'morning';
  if (hour < 15) return 'midday';
  if (hour < 19) return 'afternoon';
  return 'evening';
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
