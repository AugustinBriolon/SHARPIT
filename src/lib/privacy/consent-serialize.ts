import { CURRENT_PRIVACY_VERSION } from '@/lib/privacy/constants';

export type ConsentSnapshot = {
  termsAcceptedAt: string | null;
  privacyAcceptedAt: string | null;
  privacyVersion: string | null;
  healthDataConsentAt: string | null;
  aiProcessingConsentAt: string | null;
  unofficialProvidersAckAt: string | null;
  deletedAt?: string | null;
  currentPrivacyVersion: string;
};

type ConsentDateRow = {
  termsAcceptedAt: Date | null;
  privacyAcceptedAt: Date | null;
  privacyVersion: string | null;
  healthDataConsentAt: Date | null;
  aiProcessingConsentAt: Date | null;
  unofficialProvidersAckAt: Date | null;
  deletedAt?: Date | null;
};

function dateToIso(value: Date | null | undefined): string | null {
  return value?.toISOString() ?? null;
}

export function serializeConsentRow(row: ConsentDateRow, options?: { includeDeleted?: boolean }) {
  const snapshot: ConsentSnapshot = {
    termsAcceptedAt: dateToIso(row.termsAcceptedAt),
    privacyAcceptedAt: dateToIso(row.privacyAcceptedAt),
    privacyVersion: row.privacyVersion,
    healthDataConsentAt: dateToIso(row.healthDataConsentAt),
    aiProcessingConsentAt: dateToIso(row.aiProcessingConsentAt),
    unofficialProvidersAckAt: dateToIso(row.unofficialProvidersAckAt),
    currentPrivacyVersion: CURRENT_PRIVACY_VERSION,
  };
  if (options?.includeDeleted) {
    snapshot.deletedAt = dateToIso(row.deletedAt);
  }
  return snapshot;
}
