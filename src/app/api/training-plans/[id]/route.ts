import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { archiveTrainingPlan } from '@/lib/queries';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const athleteId = await getCurrentAthleteId();
    const plan = await archiveTrainingPlan(athleteId, id);
    return NextResponse.json(plan);
  } catch (error) {
    console.error('[training-plans/id]', error);
    return NextResponse.json({ error: "Impossible d'archiver le macro-plan" }, { status: 500 });
  }
}
