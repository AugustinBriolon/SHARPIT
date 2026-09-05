import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

describe('TodaySignalStrip overnight résumé', () => {
  const source = readFileSync(
    resolve(process.cwd(), 'src/components/today/dashboard/today-signal-strip.tsx'),
    'utf8',
  );

  it('renders twin overnight score cards for sleep and recovery', () => {
    expect(source).toContain('OvernightScoreCard');
    expect(source).toContain('Score sommeil');
    expect(source).toContain('Score récupération');
    expect(source).toContain('pickTodayResumeSignalPreviews');
    expect(source).toContain('grid-cols-2');
    expect(source).not.toContain('grid-cols-1');
    expect(source).not.toContain("label: 'Adaptation'");
    expect(source).not.toContain('Sparkline');
  });

  it('does not paint a limiter wash on overnight cards', () => {
    expect(source).not.toContain('isLimiter');
    expect(source).not.toContain('limiterHref');
    expect(source).not.toContain('twinDimensionFromHref');
  });

  it('keeps the same mounted chrome while loading (empty gauge, no text skeletons)', () => {
    expect(source).toContain('loading');
    expect(source).toContain('score: null');
    expect(source).not.toContain('SkeletonDataValue');
    expect(source).not.toContain('CardSkeleton');
    expect(source).not.toContain('OvernightLoadingPair');
  });
});
