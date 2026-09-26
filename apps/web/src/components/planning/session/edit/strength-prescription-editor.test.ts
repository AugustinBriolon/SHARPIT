import { describe, expect, it } from 'vitest';
import {
  draftFromStrengthPrescription,
  strengthPrescriptionFromDraft,
} from './strength-prescription-editor';

describe('strengthPrescriptionFromDraft', () => {
  it('round-trips draft rows with Lap rest by default', () => {
    const draft = draftFromStrengthPrescription({
      version: 1,
      sets: [{ exercise: 'Curl', sets: 3, reps: 10, restMode: 'lap', order: 0 }],
    });
    const back = strengthPrescriptionFromDraft(draft);
    expect(back?.sets).toHaveLength(1);
    expect(back?.sets[0]).toMatchObject({
      exercise: 'Curl',
      sets: 3,
      reps: 10,
      restMode: 'lap',
      restSec: null,
    });
  });

  it('drops blank exercise rows', () => {
    const draft = draftFromStrengthPrescription(null);
    draft[0].exercise = '';
    expect(strengthPrescriptionFromDraft(draft)).toBeNull();
  });
});
