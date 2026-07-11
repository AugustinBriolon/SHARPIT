import { NextResponse } from 'next/server';
import { getPlannedSessionById } from '@/lib/queries';
import { buildPlannedSessionViewModel } from '@/lib/presentation/planned-session';
import { resolvePlannedSessionContext } from '@/lib/planned-session/resolve-context';
import { buildPlannedSessionCompletionComparison } from '@/lib/planned-session/completion-comparison';
import { resolveActivityEnvironmentPresentation } from '@/lib/environment/activity-environment';

export const dynamic = 'force-dynamic';

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteProps) {
  const { id } = await params;
  const session = await getPlannedSessionById(id);

  if (!session) {
    return NextResponse.json({ error: 'Séance planifiée introuvable.' }, { status: 404 });
  }

  const context = await resolvePlannedSessionContext(session);

  let completion = null;
  if (session.activityId && session.activity) {
    const envPresentation = await resolveActivityEnvironmentPresentation({
      athleteId: 'default',
      activity: {
        id: session.activity.id,
        type: session.activity.type,
        date: session.activity.date,
        duration: session.activity.duration,
        weather: session.activity.weather,
      },
    });

    const cachedContext =
      session.environmentContext && typeof session.environmentContext === 'object'
        ? (session.environmentContext as unknown as Awaited<
            ReturnType<typeof resolvePlannedSessionContext>
          >)
        : context;

    completion = buildPlannedSessionCompletionComparison({
      plannedContext: cachedContext,
      observedCorrection: envPresentation.visible ? envPresentation.correction : null,
      observedThermalLevel: null,
      observedTrainingImpact: null,
    });
  }

  const viewModel = buildPlannedSessionViewModel({
    session,
    context,
    completion,
  });

  return NextResponse.json({ viewModel });
}
