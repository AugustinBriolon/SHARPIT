import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * `minDate` fences a demo visitor to the window the seed refreshes; it is
 * undefined for a real athlete (`use-today-selected-date.ts`).
 *
 * A screen that substitutes a value when it is absent breaks day navigation in
 * three ways at once: the strip's oldest day is pinned to the selected day, the
 * previous-day arrow computes `isAtMinDate` as permanently true, and
 * `canExtendStrip` stops the scroll-back from ever loading. Recovery shipped
 * `minDate={minDate ?? date}` and lost all three — and because the fallback only
 * fires when minDate is undefined, the failure was invisible in demo mode.
 */
const DRILL_DOWN_SCREENS = [
  'src/components/recovery/recovery-screen.tsx',
  'src/components/sleep/sleep-screen.tsx',
  'src/components/effort/effort-screen.tsx',
];

describe('drill-down date navigation contract', () => {
  it('never substitutes a value for an absent minDate', () => {
    for (const path of DRILL_DOWN_SCREENS) {
      const source = readFileSync(resolve(process.cwd(), path), 'utf8');

      expect(source, `${path} must forward minDate untouched`).not.toMatch(
        /minDate=\{\s*minDate\s*(\?\?|\|\|)/,
      );
    }
  });

  it('still forwards minDate to the hero on every drill-down', () => {
    for (const path of DRILL_DOWN_SCREENS) {
      const source = readFileSync(resolve(process.cwd(), path), 'utf8');

      expect(source, `${path} must pass minDate down`).toMatch(/minDate=\{minDate\}/);
    }
  });
});
