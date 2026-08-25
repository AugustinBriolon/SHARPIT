import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MfpSessionExpiredError } from '@/lib/integrations/myfitnesspal/myfitnesspal';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { connectMfp, syncMfpNutrition } from '@/lib/integrations/myfitnesspal/myfitnesspal-sync';
import { sanitizeDataClass } from '@/lib/integrations/oauth-return';
import {
  enableProviderForAllCoveredClasses,
  enableProviderForClass,
} from '@/lib/integrations/source-prefs';
import { persistSourcePrefsMutation } from '@/lib/integrations/source-prefs-store';

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
    console.error('[MFP] connect failed:', err);
    if (err instanceof MfpSessionExpiredError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }
    const message = err instanceof Error ? err.message : 'Connexion échouée';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
