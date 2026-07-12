import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { deleteTravelContext } from '@/lib/travel-context/service';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteTravelContext(prisma, id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de supprimer le contexte voyage' },
      { status: 500 },
    );
  }
}
