/** Current Privacy Policy / Terms document version stamped on accept. */
export const CURRENT_PRIVACY_VERSION = 'v0-2026-09';

/**
 * Account deletion is immediate. Kept at 0 so the purge cron finishes any deletion
 * still marked pending (including the former 30-day soft-deletes) on its next run.
 */
export const PRIVACY_PURGE_DELAY_DAYS = 0;

/** French copy for blocked LLM / briefing paths (AI hard gate). */
export const AI_CONSENT_REQUIRED_MESSAGE =
  "Le traitement par IA n'est pas activé. Accepte le consentement IA dans Confidentialité pour utiliser le coach et les bilans générés.";

/** French copy when provider connect is blocked. */
export const PROVIDER_CONSENT_REQUIRED_MESSAGE =
  'Pour connecter une source, accepte d’abord le traitement des données de santé et l’avertissement sur les fournisseurs non officiels.';

/** French copy when legal accept is missing. */
export const LEGAL_CONSENT_REQUIRED_MESSAGE =
  'Accepte les Conditions d’utilisation, la Politique de confidentialité et le consentement données de santé pour continuer.';

export const CONTROLLER_NAME = 'Augustin Briolon';
export const CONTROLLER_EMAIL = 'augustin.briolon@gmail.com';
