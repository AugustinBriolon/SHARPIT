import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('PlannedSessionPreview density', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/components/today/rich/planned-session-preview.tsx'),
    'utf8',
  );

  it('exposes solo vs compact density without a map-sized sport band split', () => {
    expect(source).toContain("density?: 'solo' | 'compact'");
    expect(source).not.toContain('SPORT_IDENTITY_HEX');
    expect(source).not.toContain('SessionPreviewSportBand');
    expect(source).not.toContain('SessionPreviewGrid');
  });
});

describe('TodayDaySummaryLine planned density wiring', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/components/today/rich/today-day-summary-line.tsx'),
    'utf8',
  );

  it('passes sessionCount into planned density', () => {
    expect(source).toContain('sessionCount');
    expect(source).toContain("density={sessionCount <= 1 ? 'solo' : 'compact'}");
  });
});
