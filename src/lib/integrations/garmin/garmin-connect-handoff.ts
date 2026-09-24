/**
 * Garmin handoff for the native app (ADR-040, direction A): iOS opens
 * `CONNECT_GARMIN_PATH` in an ASWebAuthenticationSession; the web runs the Garmin SSO
 * and ends on `CONNECT_GARMIN_CALLBACK_PATH`, the Associated Domains URL that closes
 * the session and hands control back to the app.
 */
export const CONNECT_GARMIN_PATH = '/connect/garmin';
export const CONNECT_GARMIN_START_PATH = '/connect/garmin/start';
export const CONNECT_GARMIN_AUTHORIZE_PATH = '/connect/garmin/authorize';
export const CONNECT_GARMIN_CALLBACK_PATH = '/connect/garmin/callback';

/** Outcome carried on the callback URL as `?garmin=<status>`. */
export type GarminHandoffStatus =
  | 'connected'
  | 'already_connected'
  | 'cancelled'
  | 'denied'
  | 'invalid_state'
  | 'consent_required'
  | 'error';

export function parseGarminHandoffStatus(raw: string | null | undefined): GarminHandoffStatus {
  return raw && Object.hasOwn(HANDOFF_COPY, raw) ? (raw as GarminHandoffStatus) : 'error';
}

export function garminHandoffCallbackPath(status: GarminHandoffStatus): string {
  return `${CONNECT_GARMIN_CALLBACK_PATH}?garmin=${status}`;
}

export type GarminHandoffCopy = {
  title: string;
  description: string;
  /** Only outcomes a retry can fix offer one. */
  canRetry: boolean;
  tone: 'done' | 'neutral' | 'risk';
};

const HANDOFF_COPY: Record<GarminHandoffStatus, GarminHandoffCopy> = {
  connected: {
    title: 'Garmin connecté',
    description:
      'Tu peux revenir dans l’app. Ton Twin intègre tes données à la prochaine synchronisation.',
    canRetry: false,
    tone: 'done',
  },
  already_connected: {
    title: 'Garmin est déjà connecté',
    description: 'Rien à faire ici — tu peux revenir dans l’app.',
    canRetry: false,
    tone: 'done',
  },
  cancelled: {
    title: 'Connexion annulée',
    description: 'Aucune donnée n’a été partagée. Tu peux revenir dans l’app.',
    canRetry: true,
    tone: 'neutral',
  },
  consent_required: {
    title: 'Autorisation requise',
    description:
      'Garmin passe par un accès non officiel : autorise-le dans Compte → Confidentialité, puis relance la connexion.',
    canRetry: true,
    tone: 'risk',
  },
  invalid_state: {
    title: 'Session expirée',
    description: 'La connexion a pris trop de temps. Relance-la pour obtenir un nouveau lien.',
    canRetry: true,
    tone: 'risk',
  },
  denied: {
    title: 'Connexion refusée',
    description: 'Garmin n’a pas confirmé l’autorisation. Réessaie.',
    canRetry: true,
    tone: 'risk',
  },
  error: {
    title: 'Connexion impossible',
    description: 'Garmin n’a pas pu être relié à ton compte. Réessaie dans un instant.',
    canRetry: true,
    tone: 'risk',
  },
};

/** fr-FR outcome copy for the callback page — the browser fallback when iOS is not there. */
export function garminHandoffCopy(status: GarminHandoffStatus): GarminHandoffCopy {
  return HANDOFF_COPY[status];
}
