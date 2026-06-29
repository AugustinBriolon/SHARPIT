import { NextResponse } from "next/server";
import { isCoachConfigured } from "@/lib/ai";
import { generateAndStoreDailyBriefing } from "@/lib/daily-briefing";
import { getGarminAccount, syncGarminHealth } from "@/lib/garmin-sync";
import { getStravaAccount, syncStravaActivities } from "@/lib/strava-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

/** Synchro planifiée (Vercel Cron) : Strava + Garmin si connectés. */
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return unauthorized();
  }

  const result: {
    strava: Awaited<ReturnType<typeof syncStravaActivities>> | null;
    garmin: Awaited<ReturnType<typeof syncGarminHealth>> | null;
    briefing: boolean;
    errors: string[];
  } = { strava: null, garmin: null, briefing: false, errors: [] };

  const [stravaAccount, garminAccount] = await Promise.all([
    getStravaAccount(),
    getGarminAccount(),
  ]);

  if (stravaAccount) {
    try {
      result.strava = await syncStravaActivities();
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Sync Strava échouée";
      console.error("[cron/sync] Strava:", msg);
      result.errors.push(`strava: ${msg}`);
    }
  }

  if (garminAccount) {
    try {
      // 7 jours suffisent pour le cron quotidien (données déjà en base).
      result.garmin = await syncGarminHealth(7);
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Sync Garmin échouée";
      console.error("[cron/sync] Garmin:", msg);
      result.errors.push(`garmin: ${msg}`);
    }
  }

  // Bilan du jour : généré après la synchro pour s'appuyer sur des données à jour.
  if (isCoachConfigured()) {
    try {
      await generateAndStoreDailyBriefing();
      result.briefing = true;
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Génération du bilan échouée";
      console.error("[cron/sync] Briefing:", msg);
      result.errors.push(`briefing: ${msg}`);
    }
  }

  if (!stravaAccount && !garminAccount) {
    return NextResponse.json({
      ok: true,
      message: "Aucune source connectée, rien à synchroniser.",
      ...result,
    });
  }

  return NextResponse.json({
    ok: result.errors.length === 0,
    ...result,
  });
}
