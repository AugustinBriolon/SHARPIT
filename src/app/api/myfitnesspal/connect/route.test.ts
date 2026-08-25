import { describe, expect, it } from 'vitest';
import { mfpConnectSchema } from './route';

describe('mfpConnectSchema', () => {
  it('accepts a real-world session token', () => {
    expect(mfpConnectSchema.safeParse({ sessionToken: 'a'.repeat(4000) }).success).toBe(true);
  });

  it('rejects an oversized session token', () => {
    expect(mfpConnectSchema.safeParse({ sessionToken: 'a'.repeat(8001) }).success).toBe(false);
  });

  it('rejects an empty session token', () => {
    expect(mfpConnectSchema.safeParse({ sessionToken: '' }).success).toBe(false);
  });
});
