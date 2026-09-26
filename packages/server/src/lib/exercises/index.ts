export { EXERCISE_ALIASES } from '@sharpit/server/lib/exercises/aliases';
export {
  enrichStrengthExerciseVisuals,
  resolveExerciseCatalogId,
} from '@sharpit/server/lib/exercises/enrich-strength-visuals';
export {
  EXERCISE_MEDIA_ATTRIBUTION,
  EXERCISES_DATASET_CDN,
  exerciseGifUrl,
  exerciseThumbUrl,
} from '@sharpit/server/lib/exercises/media';
export { normalizeExerciseKey } from '@sharpit/server/lib/exercises/normalize';
export {
  exerciseCatalogSize,
  getExerciseMediaByCatalogId,
  resolveExerciseMedia,
  resolveStrengthSetMedia,
} from '@sharpit/server/lib/exercises/resolve';
export type {
  ExerciseCatalogEntry,
  ResolvedExerciseMedia,
} from '@sharpit/server/lib/exercises/types';
