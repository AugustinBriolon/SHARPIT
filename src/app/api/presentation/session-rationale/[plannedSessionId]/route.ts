import { NextResponse } from 'next/server';
import { getPlannedSessionById } from '@/lib/queries';
import {
  findDecisionForPlannedSession,
  findDecisionWithHistory,
} from '@/lib/decision-memory/repository';
import { buildSessionRationaleViewModel } from '@/lib/presentation/session-rationale';

export const dynamic = 'force-dynamic';

type RouteProps = { params: Promise<{ plannedSessionId: string }> };

export async function GET(_req: Request, { params }: RouteProps) {
  const { plannedSessionId } = await params;
  const session = await getPlannedSessionById(plannedSessionId);

  if (!session) {
    return NextResponse.json({ error: 'Séance planifiée introuvable.' }, { status: 404 });
  }

  const originDecision = await findDecisionForPlannedSession(plannedSessionId);
  const decision = originDecision ? await findDecisionWithHistory(originDecision.id) : null;

  const viewModel = buildSessionRationaleViewModel({
    session: {
      id: session.id,
      type: session.type,
      intensity: session.intensity,
      durationMin: session.durationMin,
      load: session.load,
      date: session.date,
      completed: session.completed,
      activityId: session.activityId,
    },
    decision,
    now: new Date(),
  });

  return NextResponse.json({ viewModel });
}
