import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('TodayUnderstandSection contract', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/components/today/dashboard/today-understand-section.tsx'),
    'utf8',
  );

  it('renders visual signal strip with secondary panels, not text-only links', () => {
    expect(source).toContain('TodaySignalStrip');
    expect(source).toContain('ActivityConsistencyPanel');
    expect(source).toContain('TodayNutritionCard');
    expect(source).not.toContain('buildUnderstandLinks');
  });
});
