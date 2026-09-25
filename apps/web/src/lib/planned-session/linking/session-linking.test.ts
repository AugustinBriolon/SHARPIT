import { describe, expect, it } from 'vitest';
import {
  formatActivityMatchLabel,
  scorePlannedActivityMatch,
} from '@/lib/planned-session/linking/session-link-match-score';

describe('scorePlannedActivityMatch', () => {
  const sessionDay = new Date('2026-07-07T08:00:00');

  it('scores highest for same day and close duration', () => {
    const score = scorePlannedActivityMatch(
      { date: sessionDay, durationMin: 60 },
      { date: new Date('2026-07-07T08:30:00'), duration: 58 * 60 },
    );
    expect(score).toBeGreaterThan(100);
  });

  it('returns 0 on an adjacent calendar day', () => {
    const score = scorePlannedActivityMatch(
      { date: sessionDay, durationMin: 45 },
      { date: new Date('2026-07-08T07:00:00'), duration: 45 * 60 },
    );
    expect(score).toBe(0);
  });

  it('returns 0 when more than one calendar day apart', () => {
    const score = scorePlannedActivityMatch(
      { date: sessionDay, durationMin: 60 },
      { date: new Date('2026-07-09T08:00:00'), duration: 60 * 60 },
    );
    expect(score).toBe(0);
  });
});

describe('formatActivityMatchLabel', () => {
  const sessionDay = new Date('2026-07-07T08:00:00');

  it('describes same-day duration delta in minutes', () => {
    expect(
      formatActivityMatchLabel(
        { date: sessionDay, durationMin: 60 },
        { date: new Date('2026-07-07T08:30:00'), duration: 72 * 60 },
      ),
    ).toBe('Même jour · Δ 12 min');
  });

  it('uses calendar offset when activity is on another day', () => {
    expect(
      formatActivityMatchLabel(
        { date: sessionDay, durationMin: 45 },
        { date: new Date('2026-07-08T07:00:00'), duration: 45 * 60 },
      ),
    ).toBe('J+1');
  });
});
