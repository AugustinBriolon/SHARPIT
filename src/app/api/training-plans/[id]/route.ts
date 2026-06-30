import { NextRequest, NextResponse } from 'next/server';
import { archiveTrainingPlan } from '@/lib/queries';

type RouteContext = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const plan = await archiveTrainingPlan(id);
    return NextResponse.json(plan);
  } catch (error) {
    console.error('[training-plans/id]', error);
    return NextResponse.json({ error: "Impossible d'archiver le macro-plan" }, { status: 500 });
  }
}
