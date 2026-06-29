import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { buildAuthorizeUrl, isGoogleConfigured } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!isGoogleConfigured()) {
    return NextResponse.json(
      {
        error:
          "Google non configuré. Ajoute GOOGLE_CLIENT_ID et GOOGLE_CLIENT_SECRET dans .env",
      },
      { status: 400 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set("google_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 600,
  });

  const origin = new URL(request.url).origin;
  return NextResponse.redirect(buildAuthorizeUrl(state, origin));
}
