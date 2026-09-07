import { afterEach, describe, expect, it } from 'vitest';
import {
  readRememberedHubRoute,
  rememberHubRoute,
  resetRememberedHubRoutesForTests,
} from './plan-hub-preview-paths';

describe('plan-hub-preview-paths', () => {
  afterEach(() => {
    resetRememberedHubRoutesForTests();
  });

  it('starts unknown then remembers a GPS path across remounts', () => {
    expect(readRememberedHubRoute('a1')).toEqual({ known: false, hasPath: false, path: null });
    const path: [number, number][] = [
      [48.8, 2.3],
      [48.81, 2.31],
    ];
    rememberHubRoute('a1', path);
    expect(readRememberedHubRoute('a1')).toEqual({ known: true, hasPath: true, path });
  });

  it('remembers an empty outdoor stream so the card does not reopen a map slot', () => {
    rememberHubRoute('indoor', null);
    expect(readRememberedHubRoute('indoor')).toEqual({
      known: true,
      hasPath: false,
      path: null,
    });
  });
});
