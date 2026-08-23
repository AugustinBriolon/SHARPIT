import { describe, expect, it } from 'vitest';
import { parseDayInput } from './thread-shift-dialog';

describe('parseDayInput', () => {
  it('reads the day the athlete picked, in calendar terms', () => {
    expect(parseDayInput('2026-08-27')).toEqual({ year: 2026, month: 8, day: 27 });
  });

  it('never goes through Date, so no timezone can shift the day', () => {
    // Parsed as an instant, this pair lands on the 26th west of Greenwich.
    expect(parseDayInput('2026-08-27')?.day).toBe(27);
  });

  it('refuses anything that is not the shape the input produces', () => {
    expect(parseDayInput('')).toBeNull();
    expect(parseDayInput('27/08/2026')).toBeNull();
    expect(parseDayInput('2026-8-27')).toBeNull();
  });

  it('refuses a date that could not exist', () => {
    expect(parseDayInput('2026-13-01')).toBeNull();
    expect(parseDayInput('2026-08-32')).toBeNull();
  });
});
