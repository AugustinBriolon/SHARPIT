import { describe, expect, it } from 'vitest';
import {
  gateUpcomingSessionsForVerdict,
  isHardSessionIntensity,
  shouldGateHardIntensities,
} from './intensity-gate';

describe('intensity-gate', () => {
  it('identifies hard intensities', () => {
    expect(isHardSessionIntensity('TEMPO')).toBe(true);
    expect(isHardSessionIntensity('THRESHOLD')).toBe(true);
    expect(isHardSessionIntensity('VO2MAX')).toBe(true);
    expect(isHardSessionIntensity('RACE')).toBe(true);
    expect(isHardSessionIntensity('RECOVERY')).toBe(false);
    expect(isHardSessionIntensity('ENDURANCE')).toBe(false);
    expect(isHardSessionIntensity(null)).toBe(false);
    expect(isHardSessionIntensity(undefined)).toBe(false);
  });

  it('activates only for RECOVER and CAUTION', () => {
    expect(shouldGateHardIntensities('RECOVER')).toBe(true);
    expect(shouldGateHardIntensities('CAUTION')).toBe(true);
    expect(shouldGateHardIntensities('TRAIN_SMART')).toBe(false);
    expect(shouldGateHardIntensities('TRAIN_EASY')).toBe(false);
    expect(shouldGateHardIntensities(null)).toBe(false);
    expect(shouldGateHardIntensities(undefined)).toBe(false);
  });

  it('proposes all sessions when the gate is inactive', () => {
    const sessions = [
      { id: '1', intensity: 'THRESHOLD' as const },
      { id: '2', intensity: 'ENDURANCE' as const },
    ];
    const result = gateUpcomingSessionsForVerdict(sessions, 'TRAIN_SMART');
    expect(result.gateActive).toBe(false);
    expect(result.proposed).toEqual(sessions);
    expect(result.withheld).toEqual([]);
  });

  it('withholds hard intensities under RECOVER / CAUTION', () => {
    const sessions = [
      { id: '1', intensity: 'TEMPO' as const },
      { id: '2', intensity: 'ENDURANCE' as const },
      { id: '3', intensity: null },
      { id: '4', intensity: 'VO2MAX' as const },
    ];
    const result = gateUpcomingSessionsForVerdict(sessions, 'RECOVER');
    expect(result.gateActive).toBe(true);
    expect(result.proposed.map((s) => s.id)).toEqual(['2', '3']);
    expect(result.withheld.map((s) => s.id)).toEqual(['1', '4']);
  });

  it('keeps structure when there is no session data yet', () => {
    const result = gateUpcomingSessionsForVerdict([], 'CAUTION');
    expect(result.gateActive).toBe(true);
    expect(result.proposed).toEqual([]);
    expect(result.withheld).toEqual([]);
    expect(result.verdict).toBe('CAUTION');
  });

  it('does not gate when Today verdict is missing (incomplete data)', () => {
    const sessions = [{ id: '1', intensity: 'RACE' as const }];
    const result = gateUpcomingSessionsForVerdict(sessions, null);
    expect(result.gateActive).toBe(false);
    expect(result.proposed).toEqual(sessions);
  });
});
