import { describe, expect, it } from 'vitest';
import { ActivityType } from '@prisma/client';
import {
  buildPlannedSessionChips,
  buildPlannedSessionIntentLine,
} from '@/components/planning/session/read/planned-session-read-helpers';
import type { ClientPlannedSession } from '@/lib/query/types';

function session(overrides: Partial<ClientPlannedSession> = {}): ClientPlannedSession {
  return {
    id: 's1',
    type: ActivityType.RUN,
    title: 'Sortie',
    date: new Date('2026-09-12T00:00:00'),
    durationMin: 105,
    load: 75,
    intensity: 'ENDURANCE',
    goalId: 'g1',
    ...overrides,
  } as ClientPlannedSession;
}

describe('buildPlannedSessionIntentLine', () => {
  it('joins duration, intensity and load as one prose line', () => {
    expect(
      buildPlannedSessionIntentLine({
        session: session(),
        mode: 'essential',
      }),
    ).toBe('105 min · Endurance · charge 75');
  });

  it('omits missing parts and returns null when empty', () => {
    expect(
      buildPlannedSessionIntentLine({
        session: session({ durationMin: null, load: null, intensity: null }),
        mode: 'essential',
      }),
    ).toBeNull();

    expect(
      buildPlannedSessionIntentLine({
        session: session({ load: null, intensity: null }),
        mode: 'essential',
      }),
    ).toBe('105 min');
  });

  it('uses TSS wording in expert mode', () => {
    expect(
      buildPlannedSessionIntentLine({
        session: session(),
        mode: 'expert',
      }),
    ).toBe('105 min · Endurance · 75 TSS');
  });
});

describe('buildPlannedSessionChips', () => {
  it('returns duration, load, intensity without a goal tile', () => {
    const chips = buildPlannedSessionChips({
      session: session(),
      goalTitle: 'Half IronMan Versailles',
      mode: 'essential',
    });

    expect(chips.map((chip) => chip.label)).toEqual(['Durée', 'Charge', 'Intensité']);
    expect(chips.some((chip) => chip.label === 'Objectif')).toBe(false);
  });
});
