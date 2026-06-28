import { NextRequest, NextResponse } from "next/server";
import { isCoachConfigured } from "@/lib/ai";
import { analyzePlannedSession } from "@/lib/coach-analysis";
import {
  getPlannedSessionById,
  linkPlannedSessionActivity,
  setPlannedSessionAnalysis,
} from "@/lib/queries";

type RouteContext = { params: Promise<{ id: string }> };

export const maxDuration = 60;

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const activityId: string | null = body?.activityId ?? null;

    const existing = await getPlannedSessionById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Séance planifiée introuvable" },
        { status: 404 },
      );
    }

    let session = await linkPlannedSessionActivity(id, activityId);

    // Analyse IA automatique au moment de la liaison (si configuré)
    if (activityId && isCoachConfigured()) {
      try {
        const analysis = await analyzePlannedSession(id);
        if (analysis) {
          session = await setPlannedSessionAnalysis(id, analysis);
        }
      } catch (err) {
        console.error("[planned-sessions/link] analyse", err);
        // on garde la liaison même si l'analyse échoue
      }
    }

    return NextResponse.json(session);
  } catch (error) {
    console.error("[planned-sessions/link]", error);
    return NextResponse.json(
      { error: "Impossible de lier la séance" },
      { status: 500 },
    );
  }
}
