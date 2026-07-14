import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { deleteCoachMemoryEntry, updateTravelMemoryEntry } from '@/lib/coach-memory/service';
import { travelContextToMemoryEntry } from '@/lib/coach-memory/present';

export const dynamic = 'force-dynamic';

const updateSchema = z.object({
  type: z.literal('TRAVEL'),
  label: z.string().optional().nullable(),
  locationLabel: z.string().min(2),
  locationLat: z.number().optional().nullable(),
  locationLng: z.number().optional().nullable(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  note: z.string().optional().nullable(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const travel = await prisma.athleteTravelContext.findUnique({ where: { id } });
    if (!travel) {
      return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 });
    }
    return NextResponse.json({ entry: travelContextToMemoryEntry(travel) });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de charger l’entrée de mémoire' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existing = await prisma.athleteTravelContext.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 });
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    if (parsed.data.endDate < parsed.data.startDate) {
      return NextResponse.json(
        { error: 'La date de fin doit être postérieure à la date de début' },
        { status: 400 },
      );
    }

    const entry = await updateTravelMemoryEntry(prisma, id, parsed.data);
    return NextResponse.json({ entry });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : 'Impossible de modifier l’entrée de mémoire';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const existing = await prisma.athleteTravelContext.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: 'Entrée introuvable' }, { status: 404 });
    }

    await deleteCoachMemoryEntry(prisma, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de supprimer l’entrée de mémoire' },
      { status: 500 },
    );
  }
}
