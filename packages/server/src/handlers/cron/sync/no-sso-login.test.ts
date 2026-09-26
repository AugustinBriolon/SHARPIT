import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// A cron runs unattended: it must refresh stored Garmin tokens, never log in with credentials.
describe('cron sync must not import SSO login', () => {
  it('does not reference loginWithCredentials or connectGarmin', () => {
    const source = readFileSync(new URL('./handler.ts', import.meta.url), 'utf8');
    expect(source).not.toMatch(/loginWithCredentials/);
    expect(source).not.toMatch(/connectGarmin/);
    expect(source).not.toMatch(/loginGarminWidget/);
    expect(source).not.toMatch(/loginGarminMobile/);
  });
});
