import { afterEach, describe, expect, it } from 'vitest';
import {
  INVITE_COOKIE,
  canProvisionNewAthlete,
  isInviteCodeValid,
  isSignupEmailAllowed,
  isSignupGateEnabled,
  normalizeInviteCode,
  signupGateClosedCopy,
} from './signup-gate';

const ORIGINAL = { ...process.env };

afterEach(() => {
  process.env = { ...ORIGINAL };
});

describe('isSignupGateEnabled', () => {
  it('is off by default', () => {
    delete process.env.SIGNUP_GATE_ENABLED;
    delete process.env.SIGNUP_ALLOWED_EMAILS;
    delete process.env.SIGNUP_INVITE_CODES;
    expect(isSignupGateEnabled()).toBe(false);
  });

  it('turns on when SIGNUP_GATE_ENABLED=true', () => {
    process.env.SIGNUP_GATE_ENABLED = 'true';
    expect(isSignupGateEnabled()).toBe(true);
  });

  it('turns on when an allowlist is configured even without the flag', () => {
    delete process.env.SIGNUP_GATE_ENABLED;
    process.env.SIGNUP_ALLOWED_EMAILS = 'a@example.com';
    expect(isSignupGateEnabled()).toBe(true);
  });

  it('turns on when invite codes are configured even without the flag', () => {
    delete process.env.SIGNUP_GATE_ENABLED;
    process.env.SIGNUP_INVITE_CODES = 'cercle-2026';
    expect(isSignupGateEnabled()).toBe(true);
  });
});

describe('isSignupEmailAllowed', () => {
  it('matches case-insensitively against the allowlist', () => {
    process.env.SIGNUP_ALLOWED_EMAILS = 'Ada@Example.com, bob@example.com';
    expect(isSignupEmailAllowed('ada@example.com')).toBe(true);
    expect(isSignupEmailAllowed('BOB@EXAMPLE.COM')).toBe(true);
    expect(isSignupEmailAllowed('eve@example.com')).toBe(false);
  });

  it('rejects empty / missing emails', () => {
    process.env.SIGNUP_ALLOWED_EMAILS = 'ada@example.com';
    expect(isSignupEmailAllowed(null)).toBe(false);
    expect(isSignupEmailAllowed('')).toBe(false);
  });
});

describe('isInviteCodeValid', () => {
  it('accepts a configured code (timing-safe, case-insensitive)', () => {
    process.env.SIGNUP_INVITE_CODES = 'Cercle-2026, beta';
    expect(isInviteCodeValid('cercle-2026')).toBe(true);
    expect(isInviteCodeValid('BETA')).toBe(true);
    expect(isInviteCodeValid('wrong')).toBe(false);
  });

  it('rejects empty codes', () => {
    process.env.SIGNUP_INVITE_CODES = 'cercle-2026';
    expect(isInviteCodeValid(null)).toBe(false);
    expect(isInviteCodeValid('')).toBe(false);
  });
});

describe('canProvisionNewAthlete', () => {
  it('allows everyone when the gate is off', () => {
    delete process.env.SIGNUP_GATE_ENABLED;
    delete process.env.SIGNUP_ALLOWED_EMAILS;
    delete process.env.SIGNUP_INVITE_CODES;
    expect(canProvisionNewAthlete({ email: 'anyone@example.com', inviteCode: null })).toBe(true);
  });

  it('allows an allowlisted email without an invite code', () => {
    process.env.SIGNUP_GATE_ENABLED = 'true';
    process.env.SIGNUP_ALLOWED_EMAILS = 'ada@example.com';
    expect(canProvisionNewAthlete({ email: 'ada@example.com', inviteCode: null })).toBe(true);
  });

  it('allows a valid invite code without an allowlisted email', () => {
    process.env.SIGNUP_GATE_ENABLED = 'true';
    process.env.SIGNUP_INVITE_CODES = 'cercle-2026';
    expect(
      canProvisionNewAthlete({ email: 'stranger@example.com', inviteCode: 'cercle-2026' }),
    ).toBe(true);
  });

  it('blocks when the gate is on and neither email nor invite matches', () => {
    process.env.SIGNUP_GATE_ENABLED = 'true';
    process.env.SIGNUP_ALLOWED_EMAILS = 'ada@example.com';
    process.env.SIGNUP_INVITE_CODES = 'cercle-2026';
    expect(canProvisionNewAthlete({ email: 'eve@example.com', inviteCode: 'wrong' })).toBe(false);
  });

  it('blocks all new athletes when the gate is on with empty lists (fail-closed)', () => {
    process.env.SIGNUP_GATE_ENABLED = 'true';
    delete process.env.SIGNUP_ALLOWED_EMAILS;
    delete process.env.SIGNUP_INVITE_CODES;
    expect(canProvisionNewAthlete({ email: 'ada@example.com', inviteCode: 'x' })).toBe(false);
  });
});

describe('normalizeInviteCode / cookie name', () => {
  it('trims and lowercases invite codes', () => {
    expect(normalizeInviteCode('  Cercle-2026 ')).toBe('cercle-2026');
  });

  it('exports a stable invite cookie name', () => {
    expect(INVITE_COOKIE).toBe('sharpit_invite');
  });
});

describe('signupGateClosedCopy', () => {
  it('returns French athlete-facing copy without leaking config', () => {
    const copy = signupGateClosedCopy();
    expect(copy.title).toMatch(/invitation/i);
    expect(copy.body).toMatch(/cercle|invitation|autorisé/i);
    expect(copy.body).not.toMatch(/SIGNUP_|ADMIN_|CRON_/);
  });
});
