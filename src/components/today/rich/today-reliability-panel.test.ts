import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

describe('TodayReliabilityPanel athlete Pourquoi', () => {
  const source = readFileSync(
    new URL('./today-reliability-panel.tsx', import.meta.url),
    'utf8',
  );

  it('does not fall back to machine packTier in the Pourquoi summary', () => {
    expect(source).not.toMatch(/estimationChip\s*\?\?\s*reliability\.packTier/);
    expect(source).not.toMatch(/summary=\{reliability\.packTier/);
  });

  it('gates technical provenance behind ExpertOnly', () => {
    expect(source).toMatch(/ExpertOnly/);
    expect(source).toMatch(/ExpertProvenanceBody/);
    expect(source).toMatch(/buildPourquoiAthleteCopy/);
  });
});
