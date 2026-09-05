import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('PlannedSessionPreview density', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/components/today/rich/planned-session-preview.tsx'),
    'utf8',
  );

  it('exposes solo and compact instrument rows without a decorative sport band', () => {
    expect(source).toContain("density?: 'solo' | 'compact'");
    expect(source).not.toContain('SPORT_IDENTITY_PANEL');
    expect(source).not.toContain('SPORT_IDENTITY_HEX');
    expect(source).not.toContain('SessionPreviewGrid');
    expect(source).not.toContain("density?: 'solo' | 'compact' | 'stack'");
    expect(source).toContain('aria-label="Matériel"');
    expect(source).toContain('equipment');
    expect(source).toContain('line-clamp-2');
    expect(source).toContain('text-pretty!');
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
