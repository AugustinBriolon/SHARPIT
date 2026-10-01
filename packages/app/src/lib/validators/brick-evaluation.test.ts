import { describe, expect, it } from 'vitest';
import { brickEvaluationSchema } from './brick-evaluation';

describe('brickEvaluationSchema', () => {
  it('accepts a full evaluation', () => {
    const result = brickEvaluationSchema.safeParse({
      brickGroupId: 'brick-1',
      rpe: 7,
      transitionRating: 4,
      feeling: 'Bien',
      notes: 'Jambes lourdes au début de la course.',
    });
    expect(result.success).toBe(true);
  });

  it('accepts a partial evaluation and nulls that clear a field', () => {
    const result = brickEvaluationSchema.safeParse({ brickGroupId: 'brick-1', rpe: null });
    expect(result.success).toBe(true);
  });

  it('rejects an RPE outside 1–10', () => {
    expect(brickEvaluationSchema.safeParse({ brickGroupId: 'b', rpe: 11 }).success).toBe(false);
    expect(brickEvaluationSchema.safeParse({ brickGroupId: 'b', rpe: 0 }).success).toBe(false);
  });

  it('rejects a transition rating outside 1–5', () => {
    expect(
      brickEvaluationSchema.safeParse({ brickGroupId: 'b', transitionRating: 6 }).success,
    ).toBe(false);
  });

  it('rejects a feeling outside the shared scale', () => {
    expect(brickEvaluationSchema.safeParse({ brickGroupId: 'b', feeling: 'Super' }).success).toBe(
      false,
    );
  });

  it('requires the brick group id', () => {
    expect(brickEvaluationSchema.safeParse({ rpe: 5 }).success).toBe(false);
  });
});
