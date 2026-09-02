import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('TodaySignalStrip overflow contract', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/components/today/dashboard/today-signal-strip.tsx'),
    'utf8',
  );

  it('truncates the label and keeps badge/value from crushing flex children', () => {
    expect(source).toContain('truncate');
    expect(source).toContain('overflow-hidden');
    expect(source).toContain('min-w-0 flex-1');
    expect(source).toMatch(/text-label shrink-0[\s\S]*Frein/);
  });
});
