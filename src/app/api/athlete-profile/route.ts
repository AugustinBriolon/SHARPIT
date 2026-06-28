import { NextRequest, NextResponse } from "next/server";
import { getAthleteProfile, upsertAthleteProfile } from "@/lib/queries";
import { athleteProfileSchema } from "@/lib/validators/athlete-profile";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await getAthleteProfile();
    return NextResponse.json(profile ?? { id: "default" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de charger le profil athlète" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = athleteProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const profile = await upsertAthleteProfile(parsed.data);
    return NextResponse.json(profile);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de mettre à jour le profil athlète" },
      { status: 500 },
    );
  }
}
