import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MfpSessionExpiredError } from '@sharpit/server/lib/integrations/myfitnesspal/myfitnesspal';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import {
  connectMfp,
  syncMfpNutrition,
} from '@sharpit/server/lib/integrations/myfitnesspal/myfitnesspal-sync';
import { sanitizeDataClass } from '@sharpit/app/lib/integrations/oauth-public-origin';
import {
  enableProviderForAllCoveredClasses,
  enableProviderForClass,
} from '@sharpit/app/lib/integrations/source-prefs';
import { persistSourcePrefsMutation } from '@sharpit/server/lib/integrations/source-prefs-store';
import { gateProviderConnect } from '@sharpit/server/lib/privacy/gate-provider-connect';
import { logSafeError } from '@sharpit/server/lib/privacy/safe-log';

import { mfpConnectSchema } from './schema';

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
