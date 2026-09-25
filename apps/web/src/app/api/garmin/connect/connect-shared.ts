import { z } from 'zod';
import { GarminLoginError } from '@/lib/integrations/garmin/garmin';

/** Legacy password body — rejected; phone UX uses GET browser SSO. */
export const garminConnectSchema = z.object({
  username: z.string().min(1).max(200),
  password: z.string().min(1).max(200),
  dataClass: z.string().optional().nullable(),
});

export const SSO_DISABLED_MESSAGE =
  'La connexion Garmin email/mot de passe via le serveur Sharpit ne fonctionne plus. Utilise « Connecter Garmin » (SSO navigateur) ou le mint local python-garminconnect.';

export function garminConnectErrorMessage(error: unknown): string {
  if (error instanceof GarminLoginError && error.reason === 'invalid_credentials') {
    return 'Connexion Garmin échouée. Vérifie tes identifiants.';
  }
  return SSO_DISABLED_MESSAGE;
}
