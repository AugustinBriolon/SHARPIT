export {
  CURRENT_PRIVACY_VERSION,
  PRIVACY_PURGE_DELAY_DAYS,
  AI_CONSENT_REQUIRED_MESSAGE,
  PROVIDER_CONSENT_REQUIRED_MESSAGE,
  LEGAL_CONSENT_REQUIRED_MESSAGE,
  CONTROLLER_NAME,
  CONTROLLER_EMAIL,
} from '@sharpit/server/lib/privacy/constants';

export {
  needsLegalConsentFromProfile,
  hasExistingHealthProcessingContext,
  canConnectProvidersFromProfile,
  canUseAiProcessingFromProfile,
  isSoftDeleted,
  isDueForPrivacyPurge,
  purgeEligibleBefore,
} from '@sharpit/server/lib/privacy/consent';

export {
  getAthleteConsentRow,
  athleteNeedsLegalConsent,
  athleteHasExistingHealthContext,
  athleteHasAiProcessingConsent,
  athleteHasHealthDataConsent,
  athleteCanConnectProvider,
  requireAiProcessingConsent,
  requireProviderConnectConsent,
  updateAthleteConsents,
  canConnectProviderFromConsents,
} from '@sharpit/server/lib/privacy/consent-store';

export {
  deleteAthleteAccount,
  purgeSoftDeletedAthletes,
  clearAthleteProviderCredentials,
} from '@sharpit/server/lib/privacy/account-deletion';
export { buildAthleteExportJson } from '@sharpit/server/lib/privacy/export';
export { sanitizeLogValue, logSafeError } from '@sharpit/server/lib/privacy/safe-log';
export {
  providerConnectRequirements,
  providerFeedsHealthData,
  providerIsUnofficial,
  isHealthSyncProvider,
  HEALTH_DATA_CLASSES,
  UNOFFICIAL_PROVIDERS,
} from '@sharpit/server/lib/privacy/provider-classification';
export {
  CONSENT_WALL_HEALTH_WITHDRAWN_REASON,
  canPersistAnalysisEvidence,
  canRunHealthDerivedAthleteRefresh,
  consentWallCopy,
  consentWallHrefAfterHealthWithdraw,
  parseConsentWallReason,
  resolveConsentWallReason,
  shouldRedirectToConsentWallAfterPatch,
} from '@sharpit/server/lib/privacy/consent-withdraw-ux';
