import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { awaitRequest } from '@/lib/next/await-request';
import {
  getAthleteConsentRow,
  updateAthleteConsents,
} from '@/lib/privacy/consent-store';
import { CURRENT_PRIVACY_VERSION } from '@/lib/privacy/constants';
import { logSafeError } from '@/lib/privacy/safe-log';

const consentBodySchema = z.object({
  acceptLegal: z.boolean().optional(),
  healthDataConsent: z.boolean().optional(),
  aiProcessingConsent: z.boolean().optional(),
  unofficialProvidersAck: z.boolean().optional(),
});

function serializeConsent(row: NonNullable<Awaited<ReturnType<typeof getAthleteConsentRow>>>) {
  return {
    termsAcceptedAt: row.termsAcceptedAt?.toISOString() ?? null,
    privacyAcceptedAt: row.privacyAcceptedAt?.toISOString() ?? null,
    privacyVersion: row.privacyVersion,
    healthDataConsentAt: row.healthDataConsentAt?.toISOString() ?? null,
    aiProcessingConsentAt: row.aiProcessingConsentAt?.toISOString() ?? null,
    unofficialProvidersAckAt: row.unofficialProvidersAckAt?.toISOString() ?? null,
    deletedAt: row.deletedAt?.toISOString() ?? null,
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
    // Soft-wall accept must stamp health consent (art. 9 — sync + processing).
    if (parsed.data.acceptLegal && parsed.data.healthDataConsent !== true) {
      return NextResponse.json(
        {
          error:
            'Le consentement données de santé est requis pour utiliser SharpIt (sync et traitements).',
          code: 'health_data_consent_required',
        },
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
