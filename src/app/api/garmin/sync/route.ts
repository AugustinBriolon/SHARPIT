import { NextRequest, NextResponse } from "next/server";
import { syncGarminHealth } from "@/lib/garmin-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    let days = 30;
    try {
      const body = await request.json();
      if (body?.days) days = Math.min(Number(body.days), 365);
    } catch {
      // pas de body, on garde 30 jours
    }

    const result = await syncGarminHealth(days);
    return NextResponse.json(result);
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Synchronisation échouée";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
