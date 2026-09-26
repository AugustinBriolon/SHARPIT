import { describe, expect, it } from 'vitest';
import { shouldUseNeonAdapter } from './neon-adapter';

const NEON = 'postgresql://user@ep-x.eu-central-1.aws.neon.tech/db';
const LOCAL = 'postgresql://postgres@localhost:5432/sharpit';

describe('shouldUseNeonAdapter', () => {
  it('uses the adapter for a Neon host and not for a local one', () => {
    expect(shouldUseNeonAdapter(NEON, undefined)).toBe(true);
    expect(shouldUseNeonAdapter(LOCAL, undefined)).toBe(false);
  });

  it('lets PRISMA_NEON_ADAPTER force it either way', () => {
    expect(shouldUseNeonAdapter(NEON, 'false')).toBe(false);
    expect(shouldUseNeonAdapter(LOCAL, 'true')).toBe(true);
  });

  it('never uses it without a connection string', () => {
    expect(shouldUseNeonAdapter(undefined, 'true')).toBe(false);
  });
});
