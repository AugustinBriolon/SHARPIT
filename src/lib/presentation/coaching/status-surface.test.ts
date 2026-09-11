import { describe, expect, it } from 'vitest';

import {
  ADEQUATE_TONE,
  CAUTION_TONE,
  ELEVATED_TONE,
  RISK_TONE,
  STATUS_SURFACE,
} from './status-surface';

describe('STATUS_SURFACE', () => {
  it('uses primary tokens for done states (not raw emerald)', () => {
    expect(STATUS_SURFACE.done).toContain('primary');
    expect(STATUS_SURFACE.done).not.toContain('emerald');
  });

  it('keeps highlight badge on Lime Pulse', () => {
    expect(STATUS_SURFACE.highlightBadge).toContain('highlight');
  });
});

describe('ADEQUATE_TONE', () => {
  it('uses eucalyptus signal-recovery, not Tailwind blue', () => {
    expect(ADEQUATE_TONE.colorClass).toContain('signal-recovery');
    expect(ADEQUATE_TONE.colorClass).not.toContain('blue');
    expect(ADEQUATE_TONE.bgClass).toContain('signal-recovery');
  });
});

describe('CAUTION_TONE / RISK_TONE', () => {
  it('uses Seed signal tokens, not Tailwind amber/red', () => {
    expect(CAUTION_TONE.colorClass).toBe('text-signal-caution');
    expect(ELEVATED_TONE.colorClass).toBe('text-signal-vo2');
    expect(RISK_TONE.colorClass).toBe('text-signal-risk');
  });
});
