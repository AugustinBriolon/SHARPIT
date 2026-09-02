import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('TodaySignalStrip limiter presentation', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/components/today/dashboard/today-signal-strip.tsx'),
    'utf8',
  );

  it('keeps truncate/overflow on dense cards and marks the limiter by color only', () => {
    expect(source).toContain('truncate');
    expect(source).toContain('overflow-hidden');
    expect(source).toContain('min-w-0 flex-1');
    expect(source).toContain("border-signal-caution/45 bg-signal-caution/8");
    expect(source).toContain("isLimiter ? 'bg-signal-caution' : signal.dotClass");
    expect(source).not.toMatch(/>\s*Frein\s*</);
    expect(source).not.toContain('text-label shrink-0');
  });
});
