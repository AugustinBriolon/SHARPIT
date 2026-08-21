import { describe, expect, it } from 'vitest';
import {
  extractStrengthSessionIntent,
  normalizeCoachStrengthPrescription,
  parseStrengthPrescription,
  resolveStrengthFieldsForPersist,
  strengthPrescriptionSchema,
} from '@/lib/planned-session/strength/strength-prescription';
import {
  draftFromStrengthPrescription,
  strengthPrescriptionFromDraft,
} from '@/components/planning/session/edit/strength-prescription-editor';

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
        { exercise: 'Pompe', sets: 3, reps: 12, restMode: 'time', restSec: 60, order: 0 },
        {
          exercise: 'Planche',
          sets: 3,
          reps: 0,
          durationSec: 45,
          restMode: 'lap',
          restSec: null,
          order: 1,
        },
      ],
    });
  });
});

describe('extractStrengthSessionIntent', () => {
  it('keeps the coach focus and drops the numbered exercise dump', () => {
    const description =
      'Focus chaîne postérieure et stabilité bassin.  1. Goblet Squat : 3x12 (léger) 2. Romanian Deadlift : 3x10';
    expect(extractStrengthSessionIntent(description)).toBe(
      'Focus chaîne postérieure et stabilité bassin.',
    );
  });

  it('returns null when the description is only a numbered list', () => {
    expect(extractStrengthSessionIntent('1. Squat : 3x10\n2. Pont : 3x12')).toBeNull();
  });

  it('returns null for auto-generated set summaries', () => {
    expect(extractStrengthSessionIntent('Squat 3×12 · Pont 3×15')).toBeNull();
  });

  it('keeps a short intent-only note', () => {
    expect(extractStrengthSessionIntent('Priorité hanches, charge légère.')).toBe(
      'Priorité hanches, charge légère.',
    );
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

  it('strips a conflicting exercise dump and keeps coach intent', () => {
    const result = resolveStrengthFieldsForPersist({
      type: 'STRENGTH',
      description: 'Focus chaîne postérieure. 1. Goblet Squat : 3x12 2. Romanian Deadlift : 3x10',
      strengthPrescription: {
        sets: [
          { exercise: 'Clamshell avec élastique', sets: 3, reps: 15 },
          { exercise: 'Squat avec haltère', sets: 3, reps: 10, weightKg: 12 },
        ],
      },
    });
    expect(result.description).toBe('Focus chaîne postérieure.');
    expect(result.strengthPrescription?.sets.map((s) => s.exercise)).toEqual([
      'Clamshell avec élastique',
      'Squat avec haltère',
    ]);
  });
});

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
