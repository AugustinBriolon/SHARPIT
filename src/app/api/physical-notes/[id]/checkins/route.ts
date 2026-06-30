import { NextRequest, NextResponse } from 'next/server';
import { addPhysicalCheckin, getPhysicalNoteById } from '@/lib/queries';
import { createCheckinSchema } from '@/lib/validators/physical-note';

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = createCheckinSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await getPhysicalNoteById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Note introuvable' }, { status: 404 });
    }

    const note = await addPhysicalCheckin(id, parsed.data);
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible d'ajouter le point de suivi" }, { status: 500 });
  }
}
