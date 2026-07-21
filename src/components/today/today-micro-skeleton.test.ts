import { describe, expect, it } from 'vitest';

import { isPresentationValuesLoading } from '@/hooks/use-presentation-view-model';
import { todayLoadingShell } from '@/lib/presentation/today-loading-shell';

describe('today hub loading gate', () => {
  it('treats cold start and placeholder as values-loading', () => {
    expect(isPresentationValuesLoading({ isPending: true, isPlaceholderData: false })).toBe(true);
    expect(isPresentationValuesLoading({ isPending: false, isPlaceholderData: true })).toBe(true);
  });

  it('does not flash on background refetch of the same day', () => {
    expect(isPresentationValuesLoading({ isPending: false, isPlaceholderData: false })).toBe(false);
  });

  it('provides stable chrome labels without numeric verdicts', () => {
    const shell = todayLoadingShell(new Date('2026-07-21T08:00:00'));
    expect(shell.hero.eyebrow).toBe('Ce matin');
    expect(shell.hero.headline).toBe('');
    expect(shell.whyBlock.visible).toBe(false);
    expect(shell.actionRow.actionLabel.length).toBeGreaterThan(0);
    expect(shell.weeklyTrajectory.eyebrow.length).toBeGreaterThan(0);
  });
});
