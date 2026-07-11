export const ACTIVITY_LABEL: Record<string, string> = {
  RUN: 'Course',
  BIKE: 'Vélo',
  SWIM: 'Natation',
  STRENGTH: 'Muscu',
};

export const INTENSITY_LABEL: Record<string, string> = {
  RECOVERY: 'Récupération',
  ENDURANCE: 'Endurance',
  TEMPO: 'Tempo',
  THRESHOLD: 'Seuil',
  VO2MAX: 'VO2 Max',
  RACE: 'Compétition',
};

export const ACTIVITY_COLOR: Record<string, string> = {
  RUN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
  BIKE: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400',
  SWIM: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
  STRENGTH: 'bg-violet-100 text-violet-700 dark:bg-violet-950/60 dark:text-violet-400',
  TRIATHLON: 'bg-fuchsia-100 text-fuchsia-700 dark:bg-fuchsia-950/60 dark:text-fuchsia-400',
  OTHER: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export const AUTONOMIC_SIGNAL: Record<string, { label: string; colorClass: string }> = {
  ENHANCED: { label: 'SNV: Optimal', colorClass: 'text-emerald-600 dark:text-emerald-400' },
  NORMAL: { label: 'SNV: Normal', colorClass: 'text-slate-500 dark:text-slate-400' },
  MILDLY_SUPPRESSED: { label: 'SNV: Réduit', colorClass: 'text-amber-600 dark:text-amber-400' },
  SUPPRESSED: { label: 'SNV: Supprimé', colorClass: 'text-orange-600 dark:text-orange-400' },
  CRITICALLY_SUPPRESSED: { label: 'SNV: Critique', colorClass: 'text-red-600 dark:text-red-400' },
};

export const ADAPTATION_STATUS_SIGNAL: Record<string, { label: string; colorClass: string }> = {
  POSITIVELY_ADAPTING: {
    label: 'Progression',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
  },
  MAINTAINING: { label: 'Maintien', colorClass: 'text-blue-600 dark:text-blue-400' },
  PLATEAUING: { label: 'Plateau', colorClass: 'text-amber-600 dark:text-amber-400' },
  MALADAPTING: { label: 'Inadaptation', colorClass: 'text-orange-600 dark:text-orange-400' },
  DETRAINING: { label: 'Désentraînement', colorClass: 'text-red-600 dark:text-red-400' },
};

export const DOMINANT_DIMENSION_LABEL: Record<string, string> = {
  load: 'Charge',
  neuromuscular: 'Neuromusculaire',
  metabolic: 'Métabolique',
  cumulative: 'Cumulative',
  psychological: 'Psychologique',
};

export const RECOVERY_DIMENSION_NAME: Record<string, string> = {
  autonomic: 'VFC',
  sleep: 'Sommeil',
  subjective: 'Ressenti',
  loadContext: 'Charge',
};

export const SLEEP_TREND: Record<string, { label: string; arrow: string; colorClass: string }> = {
  EXCELLENT: {
    label: 'Excellent',
    arrow: '↗',
    colorClass: 'text-emerald-600 dark:text-emerald-400',
  },
  ADEQUATE: { label: 'Correct', arrow: '→', colorClass: 'text-blue-600 dark:text-blue-400' },
  INSUFFICIENT: {
    label: 'Insuffisant',
    arrow: '↘',
    colorClass: 'text-amber-600 dark:text-amber-400',
  },
  SEVERELY_INSUFFICIENT: {
    label: 'Très insuffisant',
    arrow: '↓',
    colorClass: 'text-red-600 dark:text-red-400',
  },
};

export function formatSleepDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}
