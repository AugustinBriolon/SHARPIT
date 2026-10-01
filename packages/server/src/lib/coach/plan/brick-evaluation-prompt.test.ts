import { describe, expect, it } from 'vitest';
import { describeBrickEvaluation } from './brick-evaluation-prompt';

const EMPTY = { rpe: null, transitionRating: null, feeling: null, notes: null };

describe('describeBrickEvaluation', () => {
  it('says nothing without an evaluation', () => {
    expect(describeBrickEvaluation(null)).toBeNull();
    expect(describeBrickEvaluation({ ...EMPTY, notes: '   ' })).toBeNull();
  });

  it('lists only the answers the athlete gave', () => {
    expect(describeBrickEvaluation({ ...EMPTY, rpe: 8, feeling: 'Mal' })).toBe(
      "# Évaluation de l'athlète\nRPE global : 8/10\nRessenti : Mal",
    );
  });

  it('carries the transition rating and trimmed notes', () => {
    expect(describeBrickEvaluation({ ...EMPTY, transitionRating: 2, notes: ' T2 lente \n' })).toBe(
      "# Évaluation de l'athlète\nTransitions : 2/5\nNotes : T2 lente",
    );
  });
});
