import { NextRequest, NextResponse } from 'next/server';
import { isCoachConfigured } from '@/lib/ai';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { checkRateLimit, rateLimitJsonResponse, rateLimiters } from '@/lib/rate-limit';
import { hasProAccess } from '@/lib/access/tier';
import { getAthleteProfile } from '@/lib/queries';
import {
  generateAndStoreWeeklyReview,
  getLatestWeeklyReview,
  getWeeklyReview,
} from '@/lib/weekly-review';

export const maxDuration = 60;

/** Parse un paramètre `date` "yyyy-MM-dd" en Date locale (défaut : aujourd'hui). */
function parseDate(value: string | null): Date {
  if (!value) {
    return new Date();
  }
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) {
    return new Date();
  }
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Le bilan hebdo est un gate Pro — vérifié ici indépendamment de la page,
 * qui n'est qu'une des façons d'atteindre cette route. */
async function requireProAthlete(): Promise<string | NextResponse> {
  const athleteId = await getCurrentAthleteId();
  const profile = await getAthleteProfile(athleteId);
  if (!hasProAccess(profile?.tier ?? 'FREE')) {
    return NextResponse.json({ error: 'Fonctionnalité Pro' }, { status: 403 });
  }
  return athleteId;
}

export async function GET(request: NextRequest) {
  // Read search params before try so Cache Components prerender interrupts propagate.
  const latest = request.nextUrl.searchParams.get('latest') === '1';
  const date = parseDate(request.nextUrl.searchParams.get('date'));

  try {
    const athleteId = await requireProAthlete();
    if (athleteId instanceof NextResponse) {
      return athleteId;
    }
    const review = latest
      ? await getLatestWeeklyReview(athleteId)
      : await getWeeklyReview(athleteId, date);
    return NextResponse.json({ review: review ?? null });
  } catch (error) {
    console.error('[coach/weekly-review] GET', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isCoachConfigured()) {
    return NextResponse.json(
      { error: 'Coach IA non configuré. Ajoute AI_GATEWAY_API_KEY dans .env.' },
      { status: 503 },
    );
  }
  try {
    const body = await request.json().catch(() => ({}));
    const date = parseDate((body as { date?: string }).date ?? null);
    const athleteId = await requireProAthlete();
    if (athleteId instanceof NextResponse) {
      return athleteId;
    }
    // Depuis l'app, on veut la rétro de la semaine EN COURS (current: true).
    const rateLimit = await checkRateLimit(rateLimiters.coachReview, athleteId, { failClosed: true });
    if (!rateLimit.ok) {
      const limited = rateLimitJsonResponse(rateLimit);
      return NextResponse.json(limited.body, {
        status: limited.status,
      });
    }
    const review = await generateAndStoreWeeklyReview(athleteId, date, { current: true });
    return NextResponse.json({ review });
  } catch (error) {
    console.error('[coach/weekly-review] POST', error);
    const message = error instanceof Error ? error.message : 'Génération impossible';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
