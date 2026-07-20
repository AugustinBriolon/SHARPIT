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

/** Sport identity chips — bike emerald / swim blue only; no violet/fuchsia. */
export const ACTIVITY_COLOR: Record<string, string> = {
  RUN: 'bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400',
  BIKE: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400',
  SWIM: 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400',
  STRENGTH: 'bg-primary/10 text-primary',
  TRIATHLON: 'bg-highlight/80 text-highlight-foreground',
  OTHER: 'bg-muted text-muted-foreground',
};

export const AUTONOMIC_SIGNAL: Record<string, { label: string; colorClass: string }> = {
  ENHANCED: { label: 'SNV: Optimal', colorClass: 'text-primary' },
  NORMAL: { label: 'SNV: Normal', colorClass: 'text-muted-foreground' },
  MILDLY_SUPPRESSED: { label: 'SNV: Réduit', colorClass: 'text-signal-caution' },
  SUPPRESSED: { label: 'SNV: Supprimé', colorClass: 'text-signal-vo2' },
  CRITICALLY_SUPPRESSED: { label: 'SNV: Critique', colorClass: 'text-signal-risk' },
};

export const ADAPTATION_STATUS_SIGNAL: Record<string, { label: string; colorClass: string }> = {
  POSITIVELY_ADAPTING: {
    label: 'Progression',
    colorClass: 'text-primary',
  },
  MAINTAINING: { label: 'Maintien', colorClass: 'text-[var(--color-signal-recovery)]' },
  PLATEAUING: { label: 'Plateau', colorClass: 'text-signal-caution' },
  MALADAPTING: { label: 'Inadaptation', colorClass: 'text-signal-vo2' },
  DETRAINING: { label: 'Désentraînement', colorClass: 'text-signal-risk' },
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
    colorClass: 'text-primary',
  },
  ADEQUATE: { label: 'Correct', arrow: '→', colorClass: 'text-[var(--color-signal-recovery)]' },
  INSUFFICIENT: {
    label: 'Insuffisant',
    arrow: '↘',
    colorClass: 'text-signal-caution',
  },
  SEVERELY_INSUFFICIENT: {
    label: 'Très insuffisant',
    arrow: '↓',
    colorClass: 'text-signal-risk',
  },
};

export function formatSleepDuration(minutes: number | null): string {
  if (minutes === null) return '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${h}h ${m.toString().padStart(2, '0')}m`;
}
