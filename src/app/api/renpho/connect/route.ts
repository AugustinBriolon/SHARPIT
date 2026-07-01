import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { connectRenpho, syncRenphoHealth } from '@/lib/renpho-sync';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 });
    }

    const user = await connectRenpho(parsed.data.email, parsed.data.password);
    const sync = await syncRenphoHealth({ days: 90 });

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
    console.error(error);
    let message = 'Connexion Renpho échouée. Vérifie tes identifiants Renpho Health (app bleue).';
    if (error instanceof Error && error.message.includes('Renpho')) {
      const { message: renphoMessage } = error;
      message = renphoMessage;
    }
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
