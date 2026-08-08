import { describe, expect, it } from 'vitest';
import { formatApiErrorMessage, parseApiErrorBody } from './api-error';

describe('parseApiErrorBody', () => {
  it('extracts hike trip conflict fields', () => {
    expect(
      parseApiErrorBody({
        error: 'Une activité appartient déjà à un autre déplacement',
        tripId: 'trip-other',
        tripName: 'Alpes',
      }),
    ).toEqual({
      error: 'Une activité appartient déjà à un autre déplacement',
      tripId: 'trip-other',
      tripName: 'Alpes',
      details: undefined,
    });
  });
});

describe('formatApiErrorMessage', () => {
  it('prefers actionable copy when tripName is present', () => {
    expect(
      formatApiErrorMessage({
        error: 'Une activité appartient déjà à un autre déplacement',
        tripName: 'Alpes',
      }),
    ).toBe('Une activité est déjà dans « Alpes »');
  });

  it('falls back to error message without tripName', () => {
    expect(formatApiErrorMessage({ error: 'Données invalides' })).toBe('Données invalides');
  });
});
