import { describe, expect, it } from 'vitest';
import { isIndoorActivitySession } from '@/lib/activity/indoor-activity';

describe('isIndoorActivitySession', () => {
  it('treats STRENGTH as indoor', () => {
    expect(isIndoorActivitySession({ type: 'STRENGTH', title: 'Full body' })).toBe(true);
  });

  it('detects Zwift / home trainer titles', () => {
    expect(isIndoorActivitySession({ type: 'BIKE', title: 'Zwift - Group Ride' })).toBe(true);
    expect(isIndoorActivitySession({ type: 'BIKE', title: 'Home trainer 45′' })).toBe(true);
    expect(isIndoorActivitySession({ type: 'RUN', title: 'Tapis 8k' })).toBe(true);
  });

  it('keeps outdoor rides outdoor', () => {
    expect(isIndoorActivitySession({ type: 'BIKE', title: 'Sortie côtes' })).toBe(false);
    expect(isIndoorActivitySession({ type: 'RUN', title: 'Footing parc' })).toBe(false);
    expect(isIndoorActivitySession({ type: 'BIKE', title: null })).toBe(false);
  });

  it('can use notes when title is generic', () => {
    expect(
      isIndoorActivitySession({
        type: 'BIKE',
        title: 'Evening ride',
        notes: 'Séance indoor sur rouleau',
      }),
    ).toBe(true);
  });
});
