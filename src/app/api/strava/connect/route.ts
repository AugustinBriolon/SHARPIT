import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizeUrl, isStravaConfigured } from "@/lib/strava";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
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

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(buildAuthorizeUrl(state, origin));
}
