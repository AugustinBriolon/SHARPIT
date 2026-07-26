import { describe, expect, it } from 'vitest';
import { resolveSleepNightStatus, sleepAdequacySignalForNight } from '@/lib/presentation/sleep';
import { mapSleepScoreToAdequacy } from '@/lib/sleep/sleep-scoring';
import { mapSleepAdequacySignalToDisplay } from '@/lib/today/today-mapping';

describe('resolveSleepNightStatus', () => {
  it('is present when tonight has sleep minutes', () => {
    expect(resolveSleepNightStatus('2026-07-25', 420, '2026-07-25')).toBe('present');
  });

  it('is pending on the live day before sleep syncs', () => {
    expect(resolveSleepNightStatus('2026-07-25', null, '2026-07-25')).toBe('pending');
    expect(resolveSleepNightStatus('2026-07-25', 0, '2026-07-25')).toBe('pending');
  });

  it('is missing on a past day without sleep rows', () => {
    expect(resolveSleepNightStatus('2026-07-20', null, '2026-07-25')).toBe('missing');
  });
});

describe('sleepAdequacySignalForNight', () => {
  it('never maps a missing night to insuffisant', () => {
    expect(sleepAdequacySignalForNight('pending', null)).toBe('PENDING');
    expect(sleepAdequacySignalForNight('missing', null)).toBe('MISSING');
    expect(mapSleepAdequacySignalToDisplay('PENDING').label).toMatch(/pas encore/i);
    expect(mapSleepAdequacySignalToDisplay('MISSING').label).toMatch(/pas de données/i);
  });

  it('maps real scores only when the night is present', () => {
    expect(sleepAdequacySignalForNight('present', 95)).toBe('EXCELLENT');
    expect(sleepAdequacySignalForNight('present', 50)).toBe('INSUFFICIENT');
    expect(mapSleepScoreToAdequacy(null)).toBeNull();
  });
});
