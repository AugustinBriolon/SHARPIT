import { NextRequest, NextResponse } from "next/server";
import { isCoachConfigured } from "@/lib/ai";
import {
  generateAndStoreWeeklyReview,
  getWeeklyReview,
} from "@/lib/weekly-review";

export const maxDuration = 60;

/** Parse un paramètre `date` "yyyy-MM-dd" en Date locale (défaut : aujourd'hui). */
function parseDate(value: string | null): Date {
  if (!value) return new Date();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!m) return new Date();
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

export async function GET(request: NextRequest) {
  try {
    const date = parseDate(request.nextUrl.searchParams.get("date"));
    const review = await getWeeklyReview(date);
    return NextResponse.json({ review: review ?? null });
  } catch (error) {
    console.error("[coach/weekly-review] GET", error);
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!isCoachConfigured()) {
    return NextResponse.json(
      { error: "Coach IA non configuré. Ajoute AI_GATEWAY_API_KEY dans .env." },
      { status: 503 },
    );
  }
  try {
    const body = await request.json().catch(() => ({}));
    const date = parseDate((body as { date?: string }).date ?? null);
    // Depuis l'app, on veut la rétro de la semaine EN COURS (current: true).
    const review = await generateAndStoreWeeklyReview(date, { current: true });
    return NextResponse.json({ review });
  } catch (error) {
    console.error("[coach/weekly-review] POST", error);
    const message =
      error instanceof Error ? error.message : "Génération impossible";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
