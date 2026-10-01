import { isSet } from '@sharpit/shared/value';

type BrickEvaluationAnswers = {
  rpe: number | null;
  transitionRating: number | null;
  feeling: string | null;
  notes: string | null;
};

/** The athlete's own verdict on the brick, as a prompt block — null when they gave none. */
export function describeBrickEvaluation(evaluation: BrickEvaluationAnswers | null): string | null {
  if (!evaluation) {
    return null;
  }
  const lines = [
    isSet(evaluation.rpe) ? `RPE global : ${evaluation.rpe}/10` : null,
    isSet(evaluation.transitionRating) ? `Transitions : ${evaluation.transitionRating}/5` : null,
    evaluation.feeling ? `Ressenti : ${evaluation.feeling}` : null,
    evaluation.notes?.trim() ? `Notes : ${evaluation.notes.trim()}` : null,
  ].filter((line): line is string => line !== null);
  return lines.length ? `# Évaluation de l'athlète\n${lines.join('\n')}` : null;
}
