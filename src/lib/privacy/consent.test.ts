import { describe, expect, it } from 'vitest';
import {
  canConnectProvidersFromProfile,
  canUseAiProcessingFromProfile,
  isDueForPrivacyPurge,
  isSoftDeleted,
  needsLegalConsentFromProfile,
  purgeEligibleBefore,
} from '@/lib/privacy/consent';

describe('needsLegalConsentFromProfile', () => {
  it('requires consent when timestamps are missing', () => {
    expect(
      needsLegalConsentFromProfile({
        termsAcceptedAt: null,
        privacyAcceptedAt: null,
        privacyVersion: null,
        currentPrivacyVersion: 'v0-2026-09',
        isDemo: false,
        isDevBypass: false,
      }),
    ).toBe(true);
  });

  it('skips when both accepted at current version', () => {
    expect(
      needsLegalConsentFromProfile({
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        privacyVersion: 'v0-2026-09',
        currentPrivacyVersion: 'v0-2026-09',
        isDemo: false,
        isDevBypass: false,
      }),
    ).toBe(false);
  });

  it('re-prompts when privacy version changes', () => {
    expect(
      needsLegalConsentFromProfile({
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        privacyVersion: 'v0-old',
        currentPrivacyVersion: 'v0-2026-09',
        isDemo: false,
        isDevBypass: false,
      }),
    ).toBe(true);
  });

  it('skips demo and dev bypass', () => {
    expect(
      needsLegalConsentFromProfile({
        termsAcceptedAt: null,
        privacyAcceptedAt: null,
        privacyVersion: null,
        currentPrivacyVersion: 'v0-2026-09',
        isDemo: true,
        isDevBypass: false,
      }),
    ).toBe(false);
    expect(
      needsLegalConsentFromProfile({
        termsAcceptedAt: null,
        privacyAcceptedAt: null,
        privacyVersion: null,
        currentPrivacyVersion: 'v0-2026-09',
        isDemo: false,
        isDevBypass: true,
      }),
    ).toBe(false);
  });
});

describe('provider and AI consent helpers', () => {
  it('requires both health and unofficial ack by default', () => {
    expect(
      canConnectProvidersFromProfile({
        healthDataConsentAt: new Date(),
        unofficialProvidersAckAt: null,
      }),
    ).toBe(false);
    expect(
      canConnectProvidersFromProfile({
        healthDataConsentAt: new Date(),
        unofficialProvidersAckAt: new Date(),
      }),
    ).toBe(true);
  });

  it('respects per-provider requirement flags', () => {
    expect(
      canConnectProvidersFromProfile({
        healthDataConsentAt: null,
        unofficialProvidersAckAt: null,
        needsHealthConsent: false,
        needsUnofficialAck: false,
      }),
    ).toBe(true);
  });

  it('gates AI on aiProcessingConsentAt', () => {
    expect(canUseAiProcessingFromProfile({ aiProcessingConsentAt: null })).toBe(false);
    expect(canUseAiProcessingFromProfile({ aiProcessingConsentAt: new Date() })).toBe(true);
  });
});

describe('soft-delete / purge', () => {
  it('detects soft-delete', () => {
    expect(isSoftDeleted({ deletedAt: null })).toBe(false);
    expect(isSoftDeleted({ deletedAt: new Date() })).toBe(true);
  });

  it('marks purge after 30 days', () => {
    const deletedAt = new Date('2026-08-01T00:00:00.000Z');
    expect(
      isDueForPrivacyPurge({
        deletedAt,
        now: new Date('2026-08-30T00:00:00.000Z'),
        delayDays: 30,
      }),
    ).toBe(false);
    expect(
      isDueForPrivacyPurge({
        deletedAt,
        now: new Date('2026-08-31T00:00:00.000Z'),
        delayDays: 30,
      }),
    ).toBe(true);
  });

  it('computes purgeEligibleBefore', () => {
    const now = new Date('2026-09-02T12:00:00.000Z');
    expect(purgeEligibleBefore(now, 30).toISOString()).toBe('2026-08-03T12:00:00.000Z');
  });
});
