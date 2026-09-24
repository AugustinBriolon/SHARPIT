import { describe, expect, it } from 'vitest';
import { describeClerkConfigIssues, diagnoseClerkConfig } from '@/lib/auth/clerk-config';

// Shape-only fixtures: prefixes matter, the rest is filler.
const PK_TEST = 'pk_test_fixture';
const PK_LIVE = 'pk_live_fixture';
const SK_TEST = 'sk_test_fixture';
const SK_LIVE = 'sk_live_fixture';

describe('diagnoseClerkConfig', () => {
  it('accepts a coherent pair from one instance', () => {
    expect(
      diagnoseClerkConfig({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: PK_TEST,
        CLERK_SECRET_KEY: SK_TEST,
      }),
    ).toEqual([]);
    expect(
      diagnoseClerkConfig({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: PK_LIVE,
        CLERK_SECRET_KEY: SK_LIVE,
      }),
    ).toEqual([]);
  });

  it('flags a test publishable key paired with a live secret key', () => {
    expect(
      diagnoseClerkConfig({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: PK_TEST,
        CLERK_SECRET_KEY: SK_LIVE,
      }),
    ).toEqual(['instance_mismatch']);
  });

  it('flags satellite settings on the primary domain', () => {
    expect(
      diagnoseClerkConfig({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: PK_LIVE,
        CLERK_SECRET_KEY: SK_LIVE,
        NEXT_PUBLIC_CLERK_IS_SATELLITE: 'true',
      }),
    ).toEqual(['satellite_configured']);
  });

  it('flags an after-auth redirect to the teaser', () => {
    expect(
      diagnoseClerkConfig({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: PK_LIVE,
        CLERK_SECRET_KEY: SK_LIVE,
        NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL: 'https://sharpit.app/welcome',
      }),
    ).toEqual(['after_auth_to_welcome']);
  });

  it('flags missing keys', () => {
    expect(diagnoseClerkConfig({})).toEqual(['missing_publishable_key', 'missing_secret_key']);
  });

  it('describes issues without echoing any key', () => {
    const lines = describeClerkConfigIssues(
      diagnoseClerkConfig({
        NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: PK_TEST,
        CLERK_SECRET_KEY: SK_LIVE,
      }),
    );
    expect(lines).toHaveLength(1);
    expect(lines.join(' ')).not.toMatch(/fixture/);
  });
});
