import { NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { markOnboardingComplete } from '@/lib/onboarding/status';

export async function POST() {
  try {
    const athleteId = await getCurrentAthleteId();
    await markOnboardingComplete(athleteId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[onboarding/complete]', error);
    return NextResponse.json({ error: "Impossible de terminer l'onboarding" }, { status: 500 });
  }
}
