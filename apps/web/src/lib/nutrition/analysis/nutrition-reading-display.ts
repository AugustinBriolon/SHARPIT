import type {
  NutritionCoachReadingJob,
  NutritionCoachReadingTone,
} from '@/core/presentation/nutrition-view-model';
import { CAUTION_TONE, ELEVATED_TONE } from '@/lib/presentation/coaching/status-surface';

/** Off-track is a warm "elevated" read, never the risk red — nutrition coaching does not shame. */
const TONE_CLASS: Record<NutritionCoachReadingTone, string> = {
  on_track: 'text-primary',
  watch: CAUTION_TONE.colorClass,
  off_track: ELEVATED_TONE.colorClass,
};

const JOB_LABEL: Record<NutritionCoachReadingJob, string> = {
  fuel: 'Carburant',
  quality: 'Produits',
  diet: 'Régime',
  weight: 'Objectif de poids',
};

export function nutritionReadingToneClass(tone: NutritionCoachReadingTone): string {
  return TONE_CLASS[tone];
}

export function nutritionReadingJobLabel(job: NutritionCoachReadingJob): string {
  return JOB_LABEL[job];
}

/** Where the diet tag sends the athlete: the journal preferences, filtered on nutrition. */
export const DIET_PREFERENCES_HREF = '/journal?personnaliser=nutrition';
