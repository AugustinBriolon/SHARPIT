import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { sanitizeDataClass } from '@/lib/integrations/oauth-public-origin';
import { connectRenpho, syncRenphoHealth } from '@/lib/integrations/renpho/renpho-sync';
import {
  enableProviderForAllCoveredClasses,
  enableProviderForClass,
} from '@/lib/integrations/source-prefs';
import { persistSourcePrefsMutation } from '@/lib/integrations/source-prefs-store';
import { gateProviderConnect } from '@/lib/privacy/gate-provider-connect';
import { logSafeError } from '@/lib/privacy/safe-log';

export const renphoConnectSchema = z.object({
  email: z.string().email().max(320),
  password: z.string().min(1).max(200),
  dataClass: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const consentBlock = await gateProviderConnect(request, 'renpho', 'json');
    if (consentBlock) {
      return consentBlock;
    }

    const athleteId = await getCurrentAthleteId();
    const body = await request.json();
    const parsed = renphoConnectSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const user = await connectRenpho(athleteId, parsed.data.email, parsed.data.password);

    const dataClass = sanitizeDataClass(parsed.data.dataClass);
    await persistSourcePrefsMutation(athleteId, (prefs) =>
      dataClass
        ? enableProviderForClass(prefs, dataClass, 'renpho')
        : enableProviderForAllCoveredClasses(prefs, 'renpho'),
    );

    const sync = await syncRenphoHealth(athleteId, { days: 90 });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.account_name ?? user.first_name,
      },
      sync,
    });
  } catch (error) {
    logSafeError('api/renpho/connect', error);
    let message = 'Connexion Renpho échouée. Vérifie tes identifiants Renpho Health (app bleue).';
    if (error instanceof Error && error.message.includes('Renpho')) {
      const { message: renphoMessage } = error;
      message = renphoMessage;
    }
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
