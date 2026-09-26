import { GateRedirect } from '@/components/navigation/gate-redirect';
import { getViewer } from '@/server/viewer';

/**
 * Soft wall: sends athletes missing CGU/Privacy/health accept into `/consent`.
 * Soft-deleted accounts are signed out via redirect to sign-in after clear.
 * Health consent is required (art. 9 — sync + Twin processing), same as legal docs.
 * Safety net only: sign-in / sign-up go through `/start`, which routes there directly.
 */
export async function PrivacyConsentGate() {
  const viewer = await getViewer();
  if (viewer.deleted) {
    return <GateRedirect href="/sign-in" />;
  }
  return viewer.consentWallHref ? <GateRedirect href={viewer.consentWallHref} /> : null;
}
