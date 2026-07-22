import { NextRequest, NextResponse } from 'next/server';
import { deleteGoal, getGoalById, updateGoal } from '@/lib/queries';
import { recordManualGoalAchievement } from '@/lib/goals/goal-achievements';
import { updateGoalSchema } from '@/lib/validators/goal';

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = updateGoalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const existing = await getGoalById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Objectif introuvable' }, { status: 404 });
    }

    const goal = await updateGoal(id, parsed.data as Parameters<typeof updateGoal>[1]);

    if (parsed.data.achieved === true && !existing.achieved) {
      await recordManualGoalAchievement({ ...existing, ...goal });
    }

    return NextResponse.json(goal);
  } catch (error) {
    console.error('[goals/PATCH]', error);
    const message =
      error instanceof Error ? error.message : "Impossible de mettre à jour l'objectif";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await deleteGoal(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Impossible de supprimer l'objectif" }, { status: 500 });
  }
}
