import { describe, expect, it } from 'vitest';
import { humanizeCoachTransportError } from './humanize-coach-transport-error';

describe('humanizeCoachTransportError', () => {
  it('returns the generic fallback when the error is empty', () => {
    expect(humanizeCoachTransportError(undefined)).toBe(
      'Une erreur est survenue. Réessaie dans un instant.',
    );
  });

  it('extracts the athlete-facing error from a JSON body', () => {
    expect(
      humanizeCoachTransportError(
        new Error(
          JSON.stringify({
            error: 'Tu as envoyé trop de messages d’affilée. Réessaie dans 2 minutes.',
            retryAfterSeconds: 120,
          }),
        ),
      ),
    ).toBe('Tu as envoyé trop de messages d’affilée. Réessaie dans 2 minutes.');
  });

  it('keeps a plain message as-is', () => {
    expect(humanizeCoachTransportError(new Error('Réseau coupé'))).toBe('Réseau coupé');
  });

  it('hides api-key leakage behind the generic fallback', () => {
    expect(humanizeCoachTransportError(new Error('Missing API key for gateway'))).toBe(
      'Une erreur est survenue. Réessaie dans un instant.',
    );
  });
});
