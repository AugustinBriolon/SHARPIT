import { describe, expect, it } from 'vitest';

import { parseCalendarDateParam } from './calendar-utils';

describe('parseCalendarDateParam', () => {
  it('parses a valid YYYY-MM-DD value as a local date', () => {
    const parsed = parseCalendarDateParam('2026-07-21');
    expect(parsed).not.toBeNull();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(6);
    expect(parsed?.getDate()).toBe(21);
  });

  it('rejects missing, malformed, or impossible values', () => {
    expect(parseCalendarDateParam(null)).toBeNull();
    expect(parseCalendarDateParam('')).toBeNull();
    expect(parseCalendarDateParam('21/07/2026')).toBeNull();
    expect(parseCalendarDateParam('2026-13-45')).toBeNull();
  });
});
