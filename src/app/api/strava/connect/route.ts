import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { buildAuthorizeUrl, isStravaConfigured } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isStravaConfigured()) {
    return NextResponse.json(
      {
        error:
          "Strava non configuré. Ajoute STRAVA_CLIENT_ID et STRAVA_CLIENT_SECRET dans .env",
      },
      { status: 400 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("strava_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  return NextResponse.redirect(buildAuthorizeUrl(state));
}
