import { describe, expect, it } from 'vitest';

import { productMessageForDomain } from './product-states';

describe('productMessageForDomain', () => {
  it('does not nag Today about stale body composition', () => {
    expect(productMessageForDomain('body', 'awaiting_data')).toBeNull();
  });

  it('still explains body sync in progress', () => {
    expect(productMessageForDomain('body', 'syncing')).toContain('mesures corporelles');
  });

  it('keeps sleep awaiting_data as a morning decision signal', () => {
    expect(productMessageForDomain('sleep', 'awaiting_data')).toContain('sommeil');
  });
});
