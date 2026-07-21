import { describe, expect, it } from 'vitest';

import { isPresentationValuesLoading } from '@/hooks/use-presentation-view-model';

describe('planning projection loading gate', () => {
  it('treats placeholder horizon switches as values-loading', () => {
    expect(isPresentationValuesLoading({ isPending: false, isPlaceholderData: true })).toBe(true);
  });

  it('does not flash on background refetch of the same key', () => {
    expect(isPresentationValuesLoading({ isPending: false, isPlaceholderData: false })).toBe(false);
  });
});
