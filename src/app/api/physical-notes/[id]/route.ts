import { NextRequest, NextResponse } from "next/server";
import {
  deletePhysicalNote,
  getPhysicalNoteById,
  updatePhysicalNote,
} from "@/lib/queries";
import { updatePhysicalNoteSchema } from "@/lib/validators/physical-note";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updatePhysicalNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Données invalides", details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await getPhysicalNoteById(id);
    if (!existing) {
      return NextResponse.json({ error: "Note introuvable" }, { status: 404 });
    }

    const data = { ...parsed.data } as Parameters<typeof updatePhysicalNote>[1];
    // si on passe en résolu et pas de date fournie, on la pose
    if (
      parsed.data.status === "RESOLVED" &&
      parsed.data.resolvedAt === undefined &&
      !existing.resolvedAt
    ) {
      (data as { resolvedAt?: Date }).resolvedAt = new Date();
    }
    if (parsed.data.status && parsed.data.status !== "RESOLVED") {
      (data as { resolvedAt?: Date | null }).resolvedAt = null;
    }

    const note = await updatePhysicalNote(id, data);
    return NextResponse.json(note);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de mettre à jour la note" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deletePhysicalNote(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Impossible de supprimer la note" },
      { status: 500 },
    );
  }
}
