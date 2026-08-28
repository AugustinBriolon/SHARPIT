import { NextRequest, NextResponse } from 'next/server';
import { isCurrentUserAdmin } from '@/lib/auth/admin';
import { setAthleteTier } from '@/lib/admin/queries';
import { setAthleteTierSchema } from '@/lib/validators/admin';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  // Re-checked here independently of the /admin layout guard — this route is
  // reachable on its own, layout gating alone would not protect it.
  if (!(await isCurrentUserAdmin())) {
    return NextResponse.json({ error: 'Introuvable' }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = setAthleteTierSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Palier invalide' }, { status: 400 });
  }

  try {
    const { id } = await context.params;
    const updated = await setAthleteTier(id, parsed.data.tier);
    return NextResponse.json(updated);
  } catch (error) {
    console.error('[admin/athletes/tier]', error);
    return NextResponse.json({ error: 'Mise à jour du palier impossible' }, { status: 500 });
  }
}
