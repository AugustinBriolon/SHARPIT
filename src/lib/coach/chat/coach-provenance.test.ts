import { describe, expect, it } from 'vitest';

import { buildCoachProvenanceChips } from './coach-provenance';

const NOW = new Date('2026-07-23T10:00:00');

describe('buildCoachProvenanceChips', () => {
  it('builds a recovery chip with the rounded score', () => {
    const chips = buildCoachProvenanceChips({
      recoveryScore: 81.6,
      sleepScore: null,
      now: NOW,
    });
    expect(chips).toHaveLength(1);
    expect(chips[0].key).toBe('recovery');
    expect(chips[0].label).toBe('Récup 82');
    expect(chips[0].dotClass).toContain('signal-recovery');
  });

  it('references last night (the day before) for the sleep chip', () => {
    const chips = buildCoachProvenanceChips({
      recoveryScore: null,
      sleepScore: 74,
      now: NOW,
    });
    expect(chips).toHaveLength(1);
    expect(chips[0].key).toBe('sleep');
    expect(chips[0].label).toBe('Basé sur ta nuit du 22 juillet');
  });

  it('returns both chips in recovery-first order', () => {
    const chips = buildCoachProvenanceChips({
      recoveryScore: 82,
      sleepScore: 74,
      now: NOW,
    });
    expect(chips.map((chip) => chip.key)).toEqual(['recovery', 'sleep']);
  });

  it('returns no chips when signals are missing', () => {
    expect(buildCoachProvenanceChips({ recoveryScore: null, sleepScore: null, now: NOW })).toEqual(
      [],
    );
  });
});
