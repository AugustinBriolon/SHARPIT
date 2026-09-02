import { redirect } from 'next/navigation';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { athleteNeedsLegalConsent } from '@/lib/privacy/consent-store';
import { prisma } from '@/lib/prisma';

/**
 * Soft wall: redirects athletes missing CGU/Privacy/health accept into `/consent`.
 * Soft-deleted accounts are signed out via redirect to sign-in after clear.
 * Health consent is required (art. 9 — sync + Twin processing), same as legal docs.
 */
export async function PrivacyConsentGate() {
  const athleteId = await getCurrentAthleteId();
  const profile = await prisma.athleteProfile.findUnique({
    where: { id: athleteId },
    select: { deletedAt: true },
  });
  if (profile?.deletedAt) {
    redirect('/sign-in');
  }
  if (await athleteNeedsLegalConsent(athleteId)) {
    redirect('/consent');
  }
  return null;
}
