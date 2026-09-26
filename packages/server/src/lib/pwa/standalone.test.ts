import { describe, expect, it } from 'vitest';
import { resolveStandaloneMode } from './standalone';

describe('resolveStandaloneMode', () => {
  it('is standalone when the display-mode media query matches', () => {
    expect(
      resolveStandaloneMode({ matchesDisplayModeStandalone: true, navigatorStandalone: undefined }),
    ).toBe(true);
  });

  it('is standalone when the legacy iOS navigator.standalone flag is true, even if the media query does not match', () => {
    expect(
      resolveStandaloneMode({ matchesDisplayModeStandalone: false, navigatorStandalone: true }),
    ).toBe(true);
  });

  it('is not standalone when neither signal is true', () => {
    expect(
      resolveStandaloneMode({ matchesDisplayModeStandalone: false, navigatorStandalone: false }),
    ).toBe(false);
  });

  it('is not standalone when navigatorStandalone is undefined (non-iOS) and the media query does not match', () => {
    expect(
      resolveStandaloneMode({
        matchesDisplayModeStandalone: false,
        navigatorStandalone: undefined,
      }),
    ).toBe(false);
  });
});
