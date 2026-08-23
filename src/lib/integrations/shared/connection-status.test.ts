import { describe, expect, it } from 'vitest';
import {
  GARMIN_CONNECTION_SELECT,
  MFP_CONNECTION_SELECT,
  OAUTH_CONNECTION_SELECT,
  RENPHO_CONNECTION_SELECT,
  isGarminAccountConnected,
  isMfpAccountConnected,
  isOAuthAccountConnected,
  isRenphoAccountConnected,
} from './connection-status';

/**
 * The trap these guard against: a caller selects fewer columns than the predicate
 * reads, the missing one is `undefined`, `undefined != null` is false, and the
 * account reports disconnected with no error raised anywhere. That happened to
 * every provider at once and silently disabled sync across the app.
 */
const CASES = [
  { name: 'oauth', select: OAUTH_CONNECTION_SELECT, check: isOAuthAccountConnected },
  { name: 'garmin', select: GARMIN_CONNECTION_SELECT, check: isGarminAccountConnected },
  { name: 'renpho', select: RENPHO_CONNECTION_SELECT, check: isRenphoAccountConnected },
  { name: 'mfp', select: MFP_CONNECTION_SELECT, check: isMfpAccountConnected },
] as const;

function rowFrom(select: Record<string, true>, value: unknown): Record<string, unknown> {
  return Object.fromEntries(Object.keys(select).map((key) => [key, value]));
}

describe.each(CASES)('$name connection select', ({ select, check }) => {
  it('carries every column its predicate reads', () => {
    expect(check(rowFrom(select, 'x'))).toBe(true);
  });

  it('reports disconnected when any one of them is missing', () => {
    const keys = Object.keys(select);
    for (const omitted of keys) {
      const partial = rowFrom(select, 'x');
      delete partial[omitted];
      expect(check(partial), `missing ${omitted} must not read as connected`).toBe(false);
    }
  });

  it('reports disconnected on a null credential, not just an absent one', () => {
    expect(check(rowFrom(select, null))).toBe(false);
  });

  it('reports disconnected without an account at all', () => {
    expect(check(null)).toBe(false);
    expect(check(undefined)).toBe(false);
  });
});
