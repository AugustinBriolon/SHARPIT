import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAthleteProfile, upsertAthleteProfile } from "@/lib/queries";

export const dynamic = "force-dynamic";

const schema = z.object({
  context: z.string().max(4000).nullable(),
});

export async function GET() {
  try {
    const profile = await getAthleteProfile();
    return NextResponse.json({ context: profile?.context ?? "" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de charger le contexte" },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Données invalides" }, { status: 400 });
    }
    const value = parsed.data.context?.trim() || null;
    const profile = await upsertAthleteProfile({ context: value });
    return NextResponse.json({ context: profile.context ?? "" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer le contexte" },
      { status: 500 },
    );
  }
}
