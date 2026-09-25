import { describe, expect, it } from 'vitest';
import { isHangingPromiseRejection } from '@/lib/next/hanging-promise';

describe('isHangingPromiseRejection', () => {
  it('detects Next Cache Components hanging digest', () => {
    expect(isHangingPromiseRejection({ digest: 'HANGING_PROMISE_REJECTION' })).toBe(true);
  });

  it('rejects unrelated errors', () => {
    expect(isHangingPromiseRejection(new Error('boom'))).toBe(false);
    expect(isHangingPromiseRejection(null)).toBe(false);
    expect(isHangingPromiseRejection({ digest: 'OTHER' })).toBe(false);
  });
});
