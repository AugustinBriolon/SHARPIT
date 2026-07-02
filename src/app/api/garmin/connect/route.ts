import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectGarmin } from '@/lib/integrations/garmin-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const profile = await connectGarmin(parsed.data.username, parsed.data.password);
    return NextResponse.json({ success: true, profile });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error
        ? 'Connexion Garmin échouée. Vérifie tes identifiants (et désactive le MFA si activé).'
        : 'Connexion Garmin échouée.';
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
