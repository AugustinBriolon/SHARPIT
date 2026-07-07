import { NextResponse } from 'next/server';
import { GoogleOAuthError } from '@/lib/integrations/google';
import { syncFromGoogle } from '@/lib/integrations/google-sync';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await syncFromGoogle();
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    if (error instanceof GoogleOAuthError) {
      return NextResponse.json(
        { error: error.message, needsReconnect: error.needsReconnect },
        { status: error.needsReconnect ? 401 : 500 },
      );
    }
    const message = error instanceof Error ? error.message : 'Synchronisation échouée';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
