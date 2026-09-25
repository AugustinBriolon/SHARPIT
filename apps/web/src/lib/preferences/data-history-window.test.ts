import { describe, expect, it } from 'vitest';
import {
  DEFAULT_DATA_HISTORY_YEARS,
  parseDataHistoryYears,
} from '@/lib/preferences/data-history-window';

describe('parseDataHistoryYears', () => {
  it('accepts 1–5 and falls back otherwise', () => {
    expect(parseDataHistoryYears(1)).toBe(1);
    expect(parseDataHistoryYears(5)).toBe(5);
    expect(parseDataHistoryYears(0)).toBe(DEFAULT_DATA_HISTORY_YEARS);
    expect(parseDataHistoryYears(6)).toBe(DEFAULT_DATA_HISTORY_YEARS);
    expect(parseDataHistoryYears('3')).toBe(3);
  });
});
