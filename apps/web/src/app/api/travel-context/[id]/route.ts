import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { deleteTravelContext } from '@/lib/travel-context/service';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    const athleteId = await getCurrentAthleteId();
    await deleteTravelContext(prisma, athleteId, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de supprimer le contexte voyage' },
      { status: 500 },
    );
  }
}
