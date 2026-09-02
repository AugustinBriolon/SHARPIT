export {
  CURRENT_PRIVACY_VERSION,
  PRIVACY_PURGE_DELAY_DAYS,
  AI_CONSENT_REQUIRED_MESSAGE,
  PROVIDER_CONSENT_REQUIRED_MESSAGE,
  LEGAL_CONSENT_REQUIRED_MESSAGE,
  CONTROLLER_NAME,
  CONTROLLER_EMAIL,
} from '@/lib/privacy/constants';

export {
  needsLegalConsentFromProfile,
  hasExistingHealthProcessingContext,
  canConnectProvidersFromProfile,
  canUseAiProcessingFromProfile,
  isSoftDeleted,
  isDueForPrivacyPurge,
  purgeEligibleBefore,
} from '@/lib/privacy/consent';

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
} from '@/lib/privacy/consent-store';

export {
  softDeleteAthlete,
  purgeSoftDeletedAthletes,
  clearAthleteProviderCredentials,
} from '@/lib/privacy/account-deletion';
export { buildAthleteExportJson } from '@/lib/privacy/export';
export { sanitizeLogValue, logSafeError } from '@/lib/privacy/safe-log';
export {
  providerConnectRequirements,
  providerFeedsHealthData,
  providerIsUnofficial,
  isHealthSyncProvider,
  HEALTH_DATA_CLASSES,
  UNOFFICIAL_PROVIDERS,
} from '@/lib/privacy/provider-classification';
export { loadLegalPageMarkdown, stripLegalMetaHeader } from '@/lib/privacy/load-legal-page';
