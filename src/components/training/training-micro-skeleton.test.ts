import { describe, expect, it } from 'vitest';

import { isAnyInitialQueryLoad } from '@/hooks/use-query-status';

describe('training dashboard loading gate', () => {
  it('shows value micro-skeletons while any hub query is still pending', () => {
    expect(
      isAnyInitialQueryLoad([{ isPending: false }, { isPending: true }, { isPending: false }]),
    ).toBe(true);
  });

  it('does not flash on background refetch once all hub queries have data', () => {
    expect(
      isAnyInitialQueryLoad([{ isPending: false }, { isPending: false }, { isPending: false }]),
    ).toBe(false);
  });
});
