import { describe, expect, it } from 'vitest';
import {
  canConnectProvidersFromProfile,
  canUseAiProcessingFromProfile,
  hasExistingHealthProcessingContext,
  isDueForPrivacyPurge,
  isSoftDeleted,
  needsLegalConsentFromProfile,
  purgeEligibleBefore,
} from '@/lib/privacy/consent';

describe('needsLegalConsentFromProfile', () => {
  const base = {
    termsAcceptedAt: null as Date | null,
    privacyAcceptedAt: null as Date | null,
    privacyVersion: null as string | null,
    healthDataConsentAt: null as Date | null,
    currentPrivacyVersion: 'v0-2026-09',
    isDemo: false,
    isDevBypass: false,
  };

  it('requires consent when timestamps are missing', () => {
    expect(needsLegalConsentFromProfile(base)).toBe(true);
  });

  it('requires health consent even when legal docs are accepted', () => {
    expect(
      needsLegalConsentFromProfile({
        ...base,
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        privacyVersion: 'v0-2026-09',
        healthDataConsentAt: null,
      }),
    ).toBe(true);
  });

  it('skips when legal + health accepted at current version', () => {
    expect(
      needsLegalConsentFromProfile({
        ...base,
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        privacyVersion: 'v0-2026-09',
        healthDataConsentAt: new Date(),
      }),
    ).toBe(false);
  });

  it('re-prompts when privacy version changes', () => {
    expect(
      needsLegalConsentFromProfile({
        ...base,
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        privacyVersion: 'v0-old',
        healthDataConsentAt: new Date(),
      }),
    ).toBe(true);
  });

  it('skips demo and dev bypass', () => {
    expect(needsLegalConsentFromProfile({ ...base, isDemo: true })).toBe(false);
    expect(needsLegalConsentFromProfile({ ...base, isDevBypass: true })).toBe(false);
  });
});

describe('hasExistingHealthProcessingContext', () => {
  it('is true when a santé provider is linked', () => {
    expect(
      hasExistingHealthProcessingContext({
        hasHealthProviderAccount: true,
        hasHealthObservationRows: false,
      }),
    ).toBe(true);
  });

  it('is true when health observation rows exist', () => {
    expect(
      hasExistingHealthProcessingContext({
        hasHealthProviderAccount: false,
        hasHealthObservationRows: true,
      }),
    ).toBe(true);
  });

  it('is false without providers or rows', () => {
    expect(
      hasExistingHealthProcessingContext({
        hasHealthProviderAccount: false,
        hasHealthObservationRows: false,
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
