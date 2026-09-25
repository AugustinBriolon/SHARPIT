import { describe, expect, it } from 'vitest';
import { formatApiErrorMessage, parseApiErrorBody } from './api-error';

describe('parseApiErrorBody', () => {
  it('extracts hike trip conflict fields', () => {
    expect(
      parseApiErrorBody({
        error: 'Une activité appartient déjà à un autre séjour',
        tripId: 'trip-other',
        tripName: 'Alpes',
      }),
    ).toEqual({
      error: 'Une activité appartient déjà à un autre séjour',
      detail: undefined,
      tripId: 'trip-other',
      tripName: 'Alpes',
      details: undefined,
    });
  });

  it('extracts detail when present', () => {
    expect(
      parseApiErrorBody({
        error: 'Impossible de mettre à jour le profil',
        detail: 'Column athlete.foo does not exist',
      }),
    ).toEqual({
      error: 'Impossible de mettre à jour le profil',
      detail: 'Column athlete.foo does not exist',
      tripId: undefined,
      tripName: undefined,
      details: undefined,
    });
  });
});

describe('formatApiErrorMessage', () => {
  it('prefers actionable copy when tripName is present', () => {
    expect(
      formatApiErrorMessage({
        error: 'Une activité appartient déjà à un autre séjour',
        tripName: 'Alpes',
      }),
    ).toBe('Une activité est déjà dans « Alpes »');
  });

  it('falls back to error message without tripName', () => {
    expect(formatApiErrorMessage({ error: 'Données invalides' })).toBe('Données invalides');
  });

  it('prefers detail over generic error', () => {
    expect(
      formatApiErrorMessage({
        error: 'Impossible de mettre à jour le profil',
        detail: 'Column athlete.foo does not exist',
      }),
    ).toBe('Column athlete.foo does not exist');
  });

  it('joins all fieldErrors with a middle dot', () => {
    expect(
      formatApiErrorMessage({
        error: 'Validation échouée',
        details: {
          fieldErrors: {
            heightCm: ['Taille invalide'],
            weightKg: ['Poids invalide'],
          },
        },
      }),
    ).toBe('Taille invalide · Poids invalide');
  });

  it('prefers joined fieldErrors over detail', () => {
    expect(
      formatApiErrorMessage({
        error: 'Validation échouée',
        detail: 'ignored when fields present',
        details: {
          fieldErrors: {
            email: ['Email requis'],
          },
        },
      }),
    ).toBe('Email requis');
  });
});
