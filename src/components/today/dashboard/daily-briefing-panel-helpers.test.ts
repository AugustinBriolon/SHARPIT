import { describe, expect, it } from 'vitest';

import {
  briefingSeenStorageKey,
  markBriefingSeen,
  shouldOpenBriefingByDefault,
  splitBriefingParagraphs,
} from './daily-briefing-panel-helpers';

function memoryStorage(initial: Record<string, string> = {}) {
  const map = new Map(Object.entries(initial));
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

describe('shouldOpenBriefingByDefault', () => {
  it('opens on first visit of the day outside morning', () => {
    const storage = memoryStorage();
    expect(
      shouldOpenBriefingByDefault({
        dayKey: '2026-09-02',
        now: new Date('2026-09-02T15:00:00'),
        storage,
      }),
    ).toBe(true);
  });

  it('stays collapsed after the athlete already saw it in the afternoon', () => {
    const storage = memoryStorage({
      [briefingSeenStorageKey('2026-09-02')]: '1',
    });
    expect(
      shouldOpenBriefingByDefault({
        dayKey: '2026-09-02',
        now: new Date('2026-09-02T18:30:00'),
        storage,
      }),
    ).toBe(false);
  });

  it('opens in the morning even after a prior visit', () => {
    const storage = memoryStorage({
      [briefingSeenStorageKey('2026-09-02')]: '1',
    });
    expect(
      shouldOpenBriefingByDefault({
        dayKey: '2026-09-02',
        now: new Date('2026-09-02T08:15:00'),
        storage,
      }),
    ).toBe(true);
  });
});

describe('markBriefingSeen', () => {
  it('persists the day key fingerprint', () => {
    const storage = memoryStorage();
    markBriefingSeen('2026-09-02', storage);
    expect(storage.getItem(briefingSeenStorageKey('2026-09-02'))).toBe('1');
  });
});

describe('splitBriefingParagraphs', () => {
  it('splits on blank lines and drops empties', () => {
    expect(splitBriefingParagraphs('Un.\n\nDeux.\n\n\nTrois.')).toEqual(['Un.', 'Deux.', 'Trois.']);
  });
});
