import { describe, expect, it } from 'vitest';
import {
  normalizeCoachStrengthPrescription,
  parseStrengthPrescription,
  resolveStrengthFieldsForPersist,
  strengthPrescriptionSchema,
} from '@/lib/planned-session/strength-prescription';
import {
  draftFromStrengthPrescription,
  strengthPrescriptionFromDraft,
} from '@/components/planning/session/strength-prescription-editor';

describe('strengthPrescriptionSchema', () => {
  it('accepts a valid v1 prescription', () => {
    const parsed = strengthPrescriptionSchema.parse({
      version: 1,
      sets: [
        {
          exercise: 'Pompe',
          sets: 3,
          reps: 12,
          restSec: 60,
          order: 0,
        },
      ],
    });
    expect(parsed.sets[0].exercise).toBe('Pompe');
  });
});

describe('parseStrengthPrescription', () => {
  it('returns null for empty or invalid payloads', () => {
    expect(parseStrengthPrescription(null)).toBeNull();
    expect(parseStrengthPrescription({ version: 1, sets: [] })).toBeNull();
    expect(parseStrengthPrescription({ version: 2, sets: [] })).toBeNull();
  });
});

describe('normalizeCoachStrengthPrescription', () => {
  it('assigns version and order from coach payload', () => {
    const normalized = normalizeCoachStrengthPrescription({
      sets: [
        { exercise: 'Pompe', sets: 3, reps: 12, restSec: 60 },
        { exercise: 'Planche', sets: 3, reps: 0, durationSec: 45 },
      ],
    });
    expect(normalized).toMatchObject({
      version: 1,
      sets: [
        { exercise: 'Pompe', sets: 3, reps: 12, restSec: 60, order: 0 },
        { exercise: 'Planche', sets: 3, reps: 0, durationSec: 45, restSec: 90, order: 1 },
      ],
    });
  });
});

describe('resolveStrengthFieldsForPersist', () => {
  it('clears prescription for non-STRENGTH', () => {
    expect(
      resolveStrengthFieldsForPersist({
        type: 'RUN',
        description: 'Z2',
        strengthPrescription: { sets: [{ exercise: 'Pompe', sets: 3, reps: 10 }] },
      }),
    ).toEqual({ strengthPrescription: null, description: 'Z2' });
  });

  it('fills description from STRENGTH prescription when empty', () => {
    const result = resolveStrengthFieldsForPersist({
      type: 'STRENGTH',
      description: null,
      strengthPrescription: {
        sets: [{ exercise: 'Squat', sets: 4, reps: 6, weightKg: 80 }],
      },
    });
    expect(result.strengthPrescription?.sets).toHaveLength(1);
    expect(result.description).toContain('Squat');
  });
});

describe('strengthPrescriptionFromDraft', () => {
  it('round-trips draft rows', () => {
    const draft = draftFromStrengthPrescription({
      version: 1,
      sets: [{ exercise: 'Curl', sets: 3, reps: 10, restSec: 90, order: 0 }],
    });
    const back = strengthPrescriptionFromDraft(draft);
    expect(back?.sets).toHaveLength(1);
    expect(back?.sets[0]).toMatchObject({
      exercise: 'Curl',
      sets: 3,
      reps: 10,
      restSec: 90,
    });
  });

  it('drops blank exercise rows', () => {
    const draft = draftFromStrengthPrescription(null);
    draft[0].exercise = '';
    expect(strengthPrescriptionFromDraft(draft)).toBeNull();
  });
});
