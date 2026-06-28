import { NextRequest, NextResponse } from "next/server";
import {
  createPlannedSession,
  getPlannedSessions,
} from "@/lib/queries";
import { createPlannedSessionSchema } from "@/lib/validators/planned-session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");
    const sessions = await getPlannedSessions({
      from: fromParam ? new Date(fromParam) : undefined,
      to: toParam ? new Date(toParam) : undefined,
    });
    return NextResponse.json(sessions);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de charger les séances planifiées" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createPlannedSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const session = await createPlannedSession(
      parsed.data as Parameters<typeof createPlannedSession>[0],
    );
    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de créer la séance planifiée" },
      { status: 500 },
    );
  }
}
