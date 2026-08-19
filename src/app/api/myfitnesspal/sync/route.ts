import { NextResponse } from 'next/server';
import { syncMfpNutrition } from '@/lib/integrations/myfitnesspal-sync';

export async function POST() {
  try {
    const result = await syncMfpNutrition();
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Synchronisation échouée';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
