import { HEALTH_CONSENT_REQUIRED_MESSAGE, PRIVACY_PURGE_DELAY_DAYS } from '@/lib/privacy/constants';

export type LegalConsentSnapshot = {
  termsAcceptedAt: Date | null;
  privacyAcceptedAt: Date | null;
  privacyVersion: string | null;
  deletedAt: Date | null;
};

export type ProviderConsentSnapshot = {
  healthDataConsentAt: Date | null;
  unofficialProvidersAckAt: Date | null;
};

export type AiConsentSnapshot = {
  aiProcessingConsentAt: Date | null;
};

/** True when the athlete must accept CGU + Privacy before using the app. */
export function needsLegalConsentFromProfile(input: {
  termsAcceptedAt: Date | null;
  privacyAcceptedAt: Date | null;
  privacyVersion: string | null;
  currentPrivacyVersion: string;
  isDemo: boolean;
  isDevBypass: boolean;
}): boolean {
  if (input.isDevBypass || input.isDemo) {
    return false;
  }
  if (!input.termsAcceptedAt || !input.privacyAcceptedAt) {
    return true;
  }
  // Re-prompt when the published privacy version advances.
  return input.privacyVersion !== input.currentPrivacyVersion;
}

/**
 * Soft-wall before Today: CGU + Privacy **and** explicit Art. 9 health consent.
 * Privacy Santé: consent = sync + processing — health is not optional on `/consent`.
 */
export function needsConsentWallFromProfile(input: {
  termsAcceptedAt: Date | null;
  privacyAcceptedAt: Date | null;
  privacyVersion: string | null;
  healthDataConsentAt: Date | null;
  currentPrivacyVersion: string;
  isDemo: boolean;
  isDevBypass: boolean;
}): boolean {
  if (input.isDevBypass || input.isDemo) {
    return false;
  }
  if (
    needsLegalConsentFromProfile({
      termsAcceptedAt: input.termsAcceptedAt,
      privacyAcceptedAt: input.privacyAcceptedAt,
      privacyVersion: input.privacyVersion,
      currentPrivacyVersion: input.currentPrivacyVersion,
      isDemo: false,
      isDevBypass: false,
    })
  ) {
    return true;
  }
  return !input.healthDataConsentAt;
}

/**
 * Force health consent when santé providers are linked or health rows already
 * exist without `health_data_consent_at` (legacy / post-#72 gap).
 * Soft-wall (B) always requires health; this flags exposure-driven force cases.
 */
export function mustGrantHealthConsent(input: {
  healthDataConsentAt: Date | null;
  hasSanteProvidersLinked: boolean;
  hasHealthRows: boolean;
}): boolean {
  if (input.healthDataConsentAt) {
    return false;
  }
  return input.hasSanteProvidersLinked || input.hasHealthRows;
}

/** Enc columns wiped immediately on soft-delete (not only at J+30 hard purge). */
export const providerCredentialClearData = {
  garmin: { oauth1TokenEnc: '', oauth2TokenEnc: '' },
  strava: { accessTokenEnc: '', refreshTokenEnc: '' },
  google: { accessTokenEnc: '', refreshTokenEnc: '' },
  withings: { accessTokenEnc: '', refreshTokenEnc: '' },
  renpho: { passwordEnc: '' },
  myfitnesspal: { sessionTokenEnc: '' },
} as const;

/** Soft-wall accept must include health consent (server-side). */
export function softWallAcceptRequiresHealth(input: {
  acceptLegal?: boolean;
  healthDataConsent?: boolean;
}): { ok: true } | { ok: false; error: string } {
  if (!input.acceptLegal) {
    return { ok: true };
  }
  if (input.healthDataConsent !== true) {
    return {
      ok: false,
      error: HEALTH_CONSENT_REQUIRED_MESSAGE,
    };
  }
  return { ok: true };
}

export function canConnectProvidersFromProfile(input: {
  healthDataConsentAt: Date | null;
  unofficialProvidersAckAt: Date | null;
  /** When omitted, both consents are required (legacy / UI aggregate). */
  needsHealthConsent?: boolean;
  needsUnofficialAck?: boolean;
}): boolean {
  const needsHealth = input.needsHealthConsent ?? true;
  const needsUnofficial = input.needsUnofficialAck ?? true;
  if (needsHealth && !input.healthDataConsentAt) {
    return false;
  }
  if (needsUnofficial && !input.unofficialProvidersAckAt) {
    return false;
  }
  return true;
}

export function canUseAiProcessingFromProfile(input: AiConsentSnapshot): boolean {
  return Boolean(input.aiProcessingConsentAt);
}

export function isSoftDeleted(input: { deletedAt: Date | null }): boolean {
  return input.deletedAt !== null;
}

/** Hard-purge eligibility: soft-deleted at or before (now − delayDays). */
export function isDueForPrivacyPurge(input: {
  deletedAt: Date | null;
  now: Date;
  delayDays?: number;
}): boolean {
  if (!input.deletedAt) {
    return false;
  }
  const delayDays = input.delayDays ?? PRIVACY_PURGE_DELAY_DAYS;
  const purgeAt = new Date(input.deletedAt.getTime() + delayDays * 24 * 60 * 60 * 1000);
  return purgeAt.getTime() <= input.now.getTime();
}

export function purgeEligibleBefore(now: Date, delayDays = PRIVACY_PURGE_DELAY_DAYS): Date {
  return new Date(now.getTime() - delayDays * 24 * 60 * 60 * 1000);
}
