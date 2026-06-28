import { NextRequest, NextResponse } from "next/server";
import {
  deletePlannedSession,
  getPlannedSessionById,
  updatePlannedSession,
} from "@/lib/queries";
import { updatePlannedSessionSchema } from "@/lib/validators/planned-session";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updatePlannedSessionSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await getPlannedSessionById(id);
    if (!existing) {
      return NextResponse.json(
        { error: "Séance planifiée introuvable" },
        { status: 404 },
      );
    }

    const session = await updatePlannedSession(
      id,
      parsed.data as Parameters<typeof updatePlannedSession>[1],
    );
    return NextResponse.json(session);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de mettre à jour la séance planifiée" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deletePlannedSession(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de supprimer la séance planifiée" },
      { status: 500 },
    );
  }
}
