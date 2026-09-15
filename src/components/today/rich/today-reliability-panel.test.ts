import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('TodayReliabilityPanel', () => {
  const source = readFileSync(
    new URL('./today-reliability-panel.tsx', import.meta.url),
    'utf8',
  );

  it('does not mount a Pourquoi collapsible on the Today hero', () => {
    expect(source).not.toMatch(/label=["']Pourquoi["']/);
    expect(source).not.toMatch(/CollapsibleSection/);
    expect(source).not.toMatch(/buildPourquoiAthleteCopy/);
    expect(source).not.toMatch(/AthletePourquoiBody/);
    expect(source).not.toMatch(/ExpertProvenanceBody/);
  });

  it('keeps soft-hero chip, gap bullets, and source CTAs', () => {
    expect(source).toMatch(/EstimationChip/);
    expect(source).toMatch(/VisibleGaps/);
    expect(source).toMatch(/Compléter les sources/);
    expect(source).toMatch(/Attendre la sync/);
  });

  it('does not fall back to machine packTier for the estimation chip', () => {
    expect(source).not.toMatch(/estimationChip\s*\?\?\s*reliability\.packTier/);
  });
});
