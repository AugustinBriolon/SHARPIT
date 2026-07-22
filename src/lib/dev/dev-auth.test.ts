import { afterEach, describe, expect, it, vi } from 'vitest';
import { isDevClerkBypass } from './dev-auth';

describe('isDevClerkBypass', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllEnvs();
  });

  it('is false by default', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEV_BYPASS_CLERK', '');
    expect(isDevClerkBypass()).toBe(false);
  });

  it('is true only in development with DEV_BYPASS_CLERK=true', () => {
    vi.stubEnv('NODE_ENV', 'development');
    vi.stubEnv('DEV_BYPASS_CLERK', 'true');
    expect(isDevClerkBypass()).toBe(true);
  });

  it('is false in production even when flag is set', () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('DEV_BYPASS_CLERK', 'true');
    expect(isDevClerkBypass()).toBe(false);
  });
});
