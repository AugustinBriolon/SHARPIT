import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { BRAND } from './brand-tokens';

const globalsCss = readFileSync(join(process.cwd(), 'src/app/globals.css'), 'utf8');

describe('BRAND tokens (Seed-inspired)', () => {
  it('keeps Forest Depths as ink, not the only interactive color', () => {
    expect(BRAND.forestDepths).toBe('#1c3a13');
    expect(BRAND.interactivePrimary).not.toBe(BRAND.forestDepths);
  });

  it('keeps Snow White warm off-white (never pure white)', () => {
    expect(BRAND.snowWhite).toBe('#fcfcf7');
    expect(BRAND.snowWhite).not.toBe('#ffffff');
  });

  it('exposes Lime Pulse for highlight punctuation', () => {
    expect(BRAND.limePulse).toBe('#d3fa99');
  });

  it('keeps Warm Stone with a slight lime cast toward highlight', () => {
    expect(BRAND.warmStone).toBe('#f0f1e8');
  });

  it('uses 16px instrument card radius', () => {
    expect(BRAND.radius).toBe('1rem');
  });

  it('paints analysis-panel from the themed surface token, never raw white', () => {
    const block = globalsCss.slice(globalsCss.indexOf('@utility analysis-panel'));
    const utility = block.slice(0, block.indexOf('@utility analysis-panel-alt'));
    expect(utility).toContain('background-color: var(--color-analysis-surface)');
    expect(utility).not.toContain('background-color: white');
  });
});
