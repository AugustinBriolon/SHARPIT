import { NextRequest, NextResponse } from 'next/server';
import { enrichGoalsWithProgress } from '@/lib/goals/goal-achievements';
import { createGoal, getGoals } from '@/lib/queries';
import { createGoalSchema } from '@/lib/validators/goal';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const goals = await getGoals();
    const enriched = await enrichGoalsWithProgress(goals);
    return NextResponse.json(enriched);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de charger les objectifs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createGoalSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const goal = await createGoal(parsed.data as Parameters<typeof createGoal>[0]);
    return NextResponse.json(goal, { status: 201 });
  } catch (error) {
    console.error('[goals/POST]', error);
    const message = error instanceof Error ? error.message : "Impossible de créer l'objectif";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
