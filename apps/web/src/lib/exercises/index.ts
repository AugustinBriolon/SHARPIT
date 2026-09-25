export { EXERCISE_ALIASES } from '@/lib/exercises/aliases';
export {
  enrichStrengthExerciseVisuals,
  resolveExerciseCatalogId,
} from '@/lib/exercises/enrich-strength-visuals';
export {
  EXERCISE_MEDIA_ATTRIBUTION,
  EXERCISES_DATASET_CDN,
  exerciseGifUrl,
  exerciseThumbUrl,
} from '@/lib/exercises/media';
export { normalizeExerciseKey } from '@/lib/exercises/normalize';
export {
  exerciseCatalogSize,
  getExerciseMediaByCatalogId,
  resolveExerciseMedia,
  resolveStrengthSetMedia,
} from '@/lib/exercises/resolve';
export type { ExerciseCatalogEntry, ResolvedExerciseMedia } from '@/lib/exercises/types';
