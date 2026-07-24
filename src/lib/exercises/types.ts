/**
 * Exercise catalog — Phase 1 data layer (LogPress / exercises-dataset).
 * Metadata only in-repo; media loaded on demand from jsDelivr.
 *
 * Media © Gym visual — https://gymvisual.com/ (attribution required).
 */

export type ExerciseCatalogEntry = {
  id: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  mediaId: string;
};

export type ResolvedExerciseMedia = {
  catalogId: string;
  name: string;
  bodyPart: string;
  equipment: string;
  target: string;
  thumbUrl: string;
  gifUrl: string;
  attribution: string;
};
