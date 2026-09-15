import { describe, expect, it } from 'vitest';
import {
  CONSENT_WALL_HEALTH_WITHDRAWN_REASON,
  consentWallHrefAfterHealthWithdraw,
  consentWallCopy,
  resolveConsentWallReason,
  shouldRedirectToConsentWallAfterPatch,
} from '@/lib/privacy/consent-withdraw-ux';

describe('shouldRedirectToConsentWallAfterPatch', () => {
  it('redirects when health consent is withdrawn', () => {
    expect(shouldRedirectToConsentWallAfterPatch({ healthDataConsent: false })).toBe(true);
  });

  it('does not redirect when health consent is granted', () => {
    expect(shouldRedirectToConsentWallAfterPatch({ healthDataConsent: true })).toBe(false);
  });

  it('does not redirect for AI or unofficial ack toggles', () => {
    expect(shouldRedirectToConsentWallAfterPatch({ aiProcessingConsent: false })).toBe(false);
    expect(shouldRedirectToConsentWallAfterPatch({ unofficialProvidersAck: true })).toBe(false);
  });
});

describe('consentWallHrefAfterHealthWithdraw', () => {
  it('targets /consent with health_withdrawn reason', () => {
    expect(consentWallHrefAfterHealthWithdraw()).toBe(
      `/consent?reason=${CONSENT_WALL_HEALTH_WITHDRAWN_REASON}`,
    );
  });
});

describe('resolveConsentWallReason', () => {
  const currentPrivacyVersion = 'v0-2026-09';

  it('returns health_withdrawn when legal is current but health is missing', () => {
    expect(
      resolveConsentWallReason({
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        privacyVersion: currentPrivacyVersion,
        healthDataConsentAt: null,
        currentPrivacyVersion,
      }),
    ).toBe(CONSENT_WALL_HEALTH_WITHDRAWN_REASON);
  });

  it('returns null for first-time wall (legal missing)', () => {
    expect(
      resolveConsentWallReason({
        termsAcceptedAt: null,
        privacyAcceptedAt: null,
        privacyVersion: null,
        healthDataConsentAt: null,
        currentPrivacyVersion,
      }),
    ).toBeNull();
  });

  it('returns null when privacy version must be re-accepted', () => {
    expect(
      resolveConsentWallReason({
        termsAcceptedAt: new Date(),
        privacyAcceptedAt: new Date(),
        privacyVersion: 'v0-old',
        healthDataConsentAt: null,
        currentPrivacyVersion,
      }),
    ).toBeNull();
  });
});

describe('consentWallCopy', () => {
  it('uses withdraw-specific French copy without em dashes', () => {
    const copy = consentWallCopy(CONSENT_WALL_HEALTH_WITHDRAWN_REASON);
    expect(copy.title).toBe('Consentement santé retiré');
    expect(copy.description).toMatch(/données de santé/);
    expect(copy.description).not.toMatch(/—/);
    expect(copy.cta).toMatch(/Réactiver|réactiver|Continuer/);
    expect(copy.title).not.toMatch(/—/);
  });

  it('keeps default first-time copy otherwise', () => {
    const copy = consentWallCopy(null);
    expect(copy.title).toMatch(/Confidentialité/);
    expect(copy.cta).toBe('Continuer');
  });
});
