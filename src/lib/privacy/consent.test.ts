import { describe, expect, it } from 'vitest';
import {
  canConnectProvidersFromProfile,
  canUseAiProcessingFromProfile,
  isDueForPrivacyPurge,
  isSoftDeleted,
  mustGrantHealthConsent,
  needsConsentWallFromProfile,
  needsLegalConsentFromProfile,
  purgeEligibleBefore,
  providerCredentialClearData,
  softWallAcceptRequiresHealth,
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

describe('needsConsentWallFromProfile (legal + health art.9)', () => {
  const base = {
    termsAcceptedAt: new Date(),
    privacyAcceptedAt: new Date(),
    privacyVersion: 'v0-2026-09',
    currentPrivacyVersion: 'v0-2026-09',
    isDemo: false,
    isDevBypass: false,
  };

  it('blocks Today when health_data_consent is missing (same soft-wall as CGU/Privacy)', () => {
    expect(
      needsConsentWallFromProfile({
        ...base,
        healthDataConsentAt: null,
      }),
    ).toBe(true);
  });

  it('allows Through when legal + health are accepted', () => {
    expect(
      needsConsentWallFromProfile({
        ...base,
        healthDataConsentAt: new Date(),
      }),
    ).toBe(false);
  });

  it('still blocks when legal is missing even if health is set', () => {
    expect(
      needsConsentWallFromProfile({
        ...base,
        termsAcceptedAt: null,
        healthDataConsentAt: new Date(),
      }),
    ).toBe(true);
  });
});

describe('mustGrantHealthConsent (legacy santé exposure)', () => {
  it('forces health consent when santé providers are linked without consent', () => {
    expect(
      mustGrantHealthConsent({
        healthDataConsentAt: null,
        hasSanteProvidersLinked: true,
        hasHealthRows: false,
      }),
    ).toBe(true);
  });

  it('forces health consent when health rows already exist without consent', () => {
    expect(
      mustGrantHealthConsent({
        healthDataConsentAt: null,
        hasSanteProvidersLinked: false,
        hasHealthRows: true,
      }),
    ).toBe(true);
  });

  it('does not force when consent already granted', () => {
    expect(
      mustGrantHealthConsent({
        healthDataConsentAt: new Date(),
        hasSanteProvidersLinked: true,
        hasHealthRows: true,
      }),
    ).toBe(false);
  });

  it('does not force when no santé exposure and no consent (wall still requires via B)', () => {
    expect(
      mustGrantHealthConsent({
        healthDataConsentAt: null,
        hasSanteProvidersLinked: false,
        hasHealthRows: false,
      }),
    ).toBe(false);
  });
});

describe('providerCredentialClearData (soft-delete)', () => {
  it('clears Enc credential columns for all provider account shapes', () => {
    expect(providerCredentialClearData.garmin).toEqual({
      oauth1TokenEnc: '',
      oauth2TokenEnc: '',
    });
    expect(providerCredentialClearData.strava).toEqual({
      accessTokenEnc: '',
      refreshTokenEnc: '',
    });
    expect(providerCredentialClearData.google).toEqual({
      accessTokenEnc: '',
      refreshTokenEnc: '',
    });
    expect(providerCredentialClearData.withings).toEqual({
      accessTokenEnc: '',
      refreshTokenEnc: '',
    });
    expect(providerCredentialClearData.renpho).toEqual({
      passwordEnc: '',
    });
    expect(providerCredentialClearData.myfitnesspal).toEqual({
      sessionTokenEnc: '',
    });
  });
});

describe('softWallAcceptRequiresHealth', () => {
  it('rejects acceptLegal without healthDataConsent true', () => {
    expect(softWallAcceptRequiresHealth({ acceptLegal: true })).toMatchObject({ ok: false });
    expect(
      softWallAcceptRequiresHealth({ acceptLegal: true, healthDataConsent: false }),
    ).toMatchObject({ ok: false });
  });

  it('accepts acceptLegal with healthDataConsent true', () => {
    expect(softWallAcceptRequiresHealth({ acceptLegal: true, healthDataConsent: true })).toEqual({
      ok: true,
    });
  });

  it('does not require health when only toggling optional consents', () => {
    expect(softWallAcceptRequiresHealth({ acceptLegal: undefined })).toEqual({ ok: true });
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
