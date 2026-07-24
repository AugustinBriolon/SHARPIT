/** jsDelivr CDN for exercises-dataset media (not vendored in git). */
export const EXERCISES_DATASET_CDN =
  'https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main';

export const EXERCISE_MEDIA_ATTRIBUTION = '© Gym visual — https://gymvisual.com/';

export function exerciseThumbUrl(catalogId: string, mediaId: string): string {
  return `${EXERCISES_DATASET_CDN}/images/${catalogId}-${mediaId}.jpg`;
}

export function exerciseGifUrl(catalogId: string, mediaId: string): string {
  return `${EXERCISES_DATASET_CDN}/videos/${catalogId}-${mediaId}.gif`;
}
