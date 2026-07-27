import { describe, expect, it } from 'vitest';
import { pickMaxHeartRateFromZones } from '@/lib/integrations/garmin';

describe('pickMaxHeartRateFromZones', () => {
  it('prefers DEFAULT sport maxHeartRateUsed', () => {
    expect(
      pickMaxHeartRateFromZones([
        { sport: 'RUNNING', maxHeartRateUsed: 188 },
        { sport: 'DEFAULT', maxHeartRateUsed: 193 },
        { sport: 'CYCLING', maxHeartRateUsed: 185 },
      ]),
    ).toBe(193);
  });

  it('falls back to RUNNING then first usable row', () => {
    expect(
      pickMaxHeartRateFromZones([
        { sport: 'CYCLING', maxHeartRateUsed: 185 },
        { sport: 'RUNNING', maxHeartRateUsed: 190 },
      ]),
    ).toBe(190);
    expect(pickMaxHeartRateFromZones([{ sport: 'CYCLING', maxHeartRateUsed: 185 }])).toBe(185);
  });

  it('returns null for empty or invalid payloads', () => {
    expect(pickMaxHeartRateFromZones(null)).toBeNull();
    expect(pickMaxHeartRateFromZones([])).toBeNull();
    expect(pickMaxHeartRateFromZones([{ sport: 'DEFAULT', maxHeartRateUsed: 0 }])).toBeNull();
  });
});
