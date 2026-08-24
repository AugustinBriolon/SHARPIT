import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MfpSessionExpiredError } from '@/lib/integrations/myfitnesspal/myfitnesspal';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { connectMfp, syncMfpNutrition } from '@/lib/integrations/myfitnesspal/myfitnesspal-sync';

const schema = z.object({
  sessionToken: z.string().min(1),
});

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Le cookie de session MFP est requis.' }, { status: 400 });
  }

  try {
    const athleteId = await getCurrentAthleteId();
    const { displayName } = await connectMfp(athleteId, parsed.data.sessionToken);
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
