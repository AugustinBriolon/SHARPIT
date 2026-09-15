/**
 * UX helpers for health-consent withdraw → immediate soft-wall (art. 9 fail-closed).
 */

export const CONSENT_WALL_HEALTH_WITHDRAWN_REASON = 'health_withdrawn' as const;

export type ConsentWallReason = typeof CONSENT_WALL_HEALTH_WITHDRAWN_REASON;

export type ConsentWallCopy = {
  title: string;
  description: string;
  cta: string;
  ctaBusy: string;
};

/** After a successful PATCH that clears health consent, leave Settings for the wall. */
export function shouldRedirectToConsentWallAfterPatch(body: Record<string, boolean>): boolean {
  return body.healthDataConsent === false;
}

export function consentWallHrefAfterHealthWithdraw(): string {
  return `/consent?reason=${CONSENT_WALL_HEALTH_WITHDRAWN_REASON}`;
}

/**
 * When legal docs are current but health consent is missing, the wall is a
 * re-consent after withdraw (or equivalent clear) — not first-time signup.
 */
export function resolveConsentWallReason(input: {
  termsAcceptedAt: Date | null;
  privacyAcceptedAt: Date | null;
  privacyVersion: string | null;
  healthDataConsentAt: Date | null;
  currentPrivacyVersion: string;
}): ConsentWallReason | null {
  if (!input.termsAcceptedAt || !input.privacyAcceptedAt) {
    return null;
  }
  if (input.privacyVersion !== input.currentPrivacyVersion) {
    return null;
  }
  if (!input.healthDataConsentAt) {
    return CONSENT_WALL_HEALTH_WITHDRAWN_REASON;
  }
  return null;
}

export function consentWallCopy(
  reason: string | null | undefined,
  options?: { privacyVersion?: string },
): ConsentWallCopy {
  if (reason === CONSENT_WALL_HEALTH_WITHDRAWN_REASON) {
    return {
      title: 'Consentement santé retiré',
      description:
        'Tu as retiré ton consentement pour les données de santé. Today et les traitements physiologiques restent bloqués tant que tu ne le réactives pas.',
      cta: 'Réactiver et continuer',
      ctaBusy: 'Réactivation…',
    };
  }

  const versionSuffix = options?.privacyVersion ? ` (version ${options.privacyVersion})` : '';
  return {
    title: 'Confidentialité & conditions',
    description: `Avant d'utiliser SharpIt, accepte les documents légaux et le traitement des données de santé${versionSuffix}.`,
    cta: 'Continuer',
    ctaBusy: 'Enregistrement…',
  };
}

export function parseConsentWallReason(raw: string | null | undefined): ConsentWallReason | null {
  if (raw === CONSENT_WALL_HEALTH_WITHDRAWN_REASON) {
    return CONSENT_WALL_HEALTH_WITHDRAWN_REASON;
  }
  return null;
}
