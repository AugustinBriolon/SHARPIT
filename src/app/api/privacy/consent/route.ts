import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { awaitRequest } from '@/lib/next/await-request';
import { softWallAcceptRequiresHealth } from '@/lib/privacy/consent';
import { getAthleteConsentRow, updateAthleteConsents } from '@/lib/privacy/consent-store';
import { CURRENT_PRIVACY_VERSION } from '@/lib/privacy/constants';
import { logSafeError } from '@/lib/privacy/safe-log';

const consentBodySchema = z.object({
  acceptLegal: z.boolean().optional(),
  healthDataConsent: z.boolean().optional(),
  aiProcessingConsent: z.boolean().optional(),
  unofficialProvidersAck: z.boolean().optional(),
});

function toIso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null;
}

function serializeConsent(row: NonNullable<Awaited<ReturnType<typeof getAthleteConsentRow>>>) {
  return {
    termsAcceptedAt: toIso(row.termsAcceptedAt),
    privacyAcceptedAt: toIso(row.privacyAcceptedAt),
    privacyVersion: row.privacyVersion,
    healthDataConsentAt: toIso(row.healthDataConsentAt),
    aiProcessingConsentAt: toIso(row.aiProcessingConsentAt),
    unofficialProvidersAckAt: toIso(row.unofficialProvidersAckAt),
    deletedAt: toIso(row.deletedAt),
    currentPrivacyVersion: CURRENT_PRIVACY_VERSION,
  };
}

export async function GET() {
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const row = await getAthleteConsentRow(athleteId);
    if (!row) {
      return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
    }
    return NextResponse.json({ consents: serializeConsent(row) });
  } catch (error) {
    logSafeError('privacy/consent GET', error);
    return NextResponse.json({ error: 'Impossible de lire les consentements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  await awaitRequest();

  try {
    const athleteId = await getCurrentAthleteId();
    const body = await request.json().catch(() => ({}));
    const parsed = consentBodySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Requête invalide' }, { status: 400 });
    }
    if (
      !parsed.data.acceptLegal &&
      parsed.data.healthDataConsent === undefined &&
      parsed.data.aiProcessingConsent === undefined &&
      parsed.data.unofficialProvidersAck === undefined
    ) {
      return NextResponse.json({ error: 'Aucun consentement à enregistrer' }, { status: 400 });
    }
    const softWallCheck = softWallAcceptRequiresHealth(parsed.data);
    if (!softWallCheck.ok) {
      return NextResponse.json(
        { error: softWallCheck.error, code: 'health_data_consent_required' },
        { status: 400 },
      );
    }
    const row = await updateAthleteConsents(athleteId, parsed.data);
    return NextResponse.json({ consents: serializeConsent(row) });
  } catch (error) {
    logSafeError('privacy/consent POST', error);
    return NextResponse.json(
      { error: 'Impossible d’enregistrer les consentements' },
      { status: 500 },
    );
  }
}
