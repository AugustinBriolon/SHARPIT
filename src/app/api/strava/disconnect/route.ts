import { NextResponse } from "next/server";
import { disconnectStrava } from "@/lib/strava-sync";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await disconnectStrava();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Déconnexion échouée" },
      { status: 500 },
    );
  }
}
