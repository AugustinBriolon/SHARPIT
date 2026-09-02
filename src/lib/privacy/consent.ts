import { PRIVACY_PURGE_DELAY_DAYS } from '@/lib/privacy/constants';

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

/**
 * True when the athlete must complete the consent soft-wall before Today.
 * Art. 9: health_data_consent is required with CGU/Privacy (sync + processing).
 */
export function needsLegalConsentFromProfile(input: {
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
  if (!input.termsAcceptedAt || !input.privacyAcceptedAt) {
    return true;
  }
  // Re-prompt when the published privacy version advances.
  if (input.privacyVersion !== input.currentPrivacyVersion) {
    return true;
  }
  // Soft wall: cannot reach Today without health consent (Privacy Santé V0 / art. 9).
  return !input.healthDataConsentAt;
}

/**
 * Existing health processing context — linked santé providers or stored health rows.
 * Used to force the soft-wall for athletes who already hold Art. 9 data.
 */
export function hasExistingHealthProcessingContext(input: {
  hasHealthProviderAccount: boolean;
  hasHealthObservationRows: boolean;
}): boolean {
  return input.hasHealthProviderAccount || input.hasHealthObservationRows;
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
  return input.deletedAt != null;
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
