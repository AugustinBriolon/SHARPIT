/**
 * Clerk configuration checks that need no network and print no key material — only
 * which rule is broken. The keys themselves never leave `process.env`.
 */

export type ClerkInstanceKind = 'development' | 'production';

export type ClerkConfigIssue =
  | 'missing_publishable_key'
  | 'missing_secret_key'
  /** pk and sk come from different instances: every handshake fails its signature check. */
  | 'instance_mismatch'
  /** sharpit.app is the primary domain; `clerk.sharpit.app` is its Frontend API, not a satellite. */
  | 'satellite_configured'
  /** An after-auth redirect env var points at the signed-out teaser. */
  | 'after_auth_to_welcome';

type Env = Record<string, string | undefined>;

const AFTER_AUTH_ENV = [
  'NEXT_PUBLIC_CLERK_SIGN_IN_FORCE_REDIRECT_URL',
  'NEXT_PUBLIC_CLERK_SIGN_UP_FORCE_REDIRECT_URL',
  'NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL',
  'NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL',
  'NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL',
  'NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL',
] as const;

export function clerkKeyInstance(key: string | undefined): ClerkInstanceKind | null {
  if (!key) {
    return null;
  }
  if (/^(pk|sk)_test_/.test(key)) {
    return 'development';
  }
  if (/^(pk|sk)_live_/.test(key)) {
    return 'production';
  }
  return null;
}

function isTruthy(value: string | undefined): boolean {
  return value === 'true' || value === '1';
}

function pointsAtWelcome(value: string | undefined): boolean {
  if (!value) {
    return false;
  }
  try {
    return new URL(value, 'https://sharpit.app').pathname.startsWith('/welcome');
  } catch {
    return false;
  }
}

function keysMismatch(env: Env): boolean {
  const publishableKind = clerkKeyInstance(env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);
  const secretKind = clerkKeyInstance(env.CLERK_SECRET_KEY);
  return Boolean(publishableKind && secretKind && publishableKind !== secretKind);
}

function satelliteConfigured(env: Env): boolean {
  return (
    isTruthy(env.NEXT_PUBLIC_CLERK_IS_SATELLITE) ||
    isTruthy(env.CLERK_IS_SATELLITE) ||
    Boolean(env.NEXT_PUBLIC_CLERK_DOMAIN || env.CLERK_DOMAIN)
  );
}

const RULES: ReadonlyArray<[ClerkConfigIssue, (env: Env) => boolean]> = [
  ['missing_publishable_key', (env) => !env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY],
  ['missing_secret_key', (env) => !env.CLERK_SECRET_KEY],
  ['instance_mismatch', keysMismatch],
  ['satellite_configured', satelliteConfigured],
  ['after_auth_to_welcome', (env) => AFTER_AUTH_ENV.some((name) => pointsAtWelcome(env[name]))],
];

export function diagnoseClerkConfig(env: Env = process.env): ClerkConfigIssue[] {
  return RULES.filter(([, broken]) => broken(env)).map(([issue]) => issue);
}

const ISSUE_HELP: Record<ClerkConfigIssue, string> = {
  missing_publishable_key: 'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is not set',
  missing_secret_key: 'CLERK_SECRET_KEY is not set',
  instance_mismatch:
    'publishable and secret keys belong to different Clerk instances (test vs live) — handshakes cannot be verified; set both from the same instance and redeploy',
  satellite_configured:
    'a satellite/domain env var is set, but sharpit.app is the primary domain — remove NEXT_PUBLIC_CLERK_IS_SATELLITE / NEXT_PUBLIC_CLERK_DOMAIN (and CLERK_*)',
  after_auth_to_welcome:
    'an after-sign-in/up redirect env var points at /welcome — it must be / (or unset)',
};

/** Human-readable, secret-free lines for server logs. */
export function describeClerkConfigIssues(issues: readonly ClerkConfigIssue[]): string[] {
  return issues.map((issue) => `${issue}: ${ISSUE_HELP[issue]}`);
}
