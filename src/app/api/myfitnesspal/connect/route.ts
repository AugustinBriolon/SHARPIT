import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MfpSessionExpiredError } from '@/lib/integrations/myfitnesspal/myfitnesspal';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { connectMfp, syncMfpNutrition } from '@/lib/integrations/myfitnesspal/myfitnesspal-sync';
import { sanitizeDataClass } from '@/lib/integrations/oauth-public-origin';
import {
  enableProviderForAllCoveredClasses,
  enableProviderForClass,
} from '@/lib/integrations/source-prefs';
import { persistSourcePrefsMutation } from '@/lib/integrations/source-prefs-store';
import { gateProviderConnect } from '@/lib/privacy/gate-provider-connect';
import { logSafeError } from '@/lib/privacy/safe-log';

export const mfpConnectSchema = z.object({
  sessionToken: z.string().min(1).max(8000),
  dataClass: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = mfpConnectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Le cookie de session MFP est requis.' }, { status: 400 });
  }

  try {
    const consentBlock = await gateProviderConnect(request, 'myfitnesspal', 'json');
    if (consentBlock) {
      return consentBlock;
    }

    const athleteId = await getCurrentAthleteId();
    const { displayName } = await connectMfp(athleteId, parsed.data.sessionToken);

    const dataClass = sanitizeDataClass(parsed.data.dataClass);
    await persistSourcePrefsMutation(athleteId, (prefs) =>
      dataClass
        ? enableProviderForClass(prefs, dataClass, 'myfitnesspal')
        : enableProviderForAllCoveredClasses(prefs, 'myfitnesspal'),
    );

    const sync = await syncMfpNutrition(athleteId);

    return NextResponse.json({ success: true, displayName, sync });
  } catch (err) {
    logSafeError('api/myfitnesspal/connect', err);
    if (err instanceof MfpSessionExpiredError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Connexion échouée';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
