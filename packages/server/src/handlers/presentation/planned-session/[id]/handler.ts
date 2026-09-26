import { NextResponse } from 'next/server';
import { getPlannedSessionById } from '@sharpit/server/lib/queries';
import { getCurrentAthleteId } from '@sharpit/server/lib/auth/current-athlete';
import { buildPlannedSessionViewModel } from '@sharpit/server/lib/presentation/planned-session/planned-session';
import { resolvePlannedSessionContext } from '@sharpit/server/lib/planned-session/resolve-context';
import { buildPlannedSessionCompletionComparison } from '@sharpit/server/lib/planned-session/display/completion-comparison';
import { resolveActivityEnvironmentPresentation } from '@sharpit/server/lib/environment/activity-environment';

type RouteProps = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: RouteProps) {
  const { id } = await params;
  const athleteId = await getCurrentAthleteId();
  const session = await getPlannedSessionById(athleteId, id);

  if (!session) {
    return NextResponse.json({ error: 'Séance planifiée introuvable.' }, { status: 404 });
  }

  const context = await resolvePlannedSessionContext(session);

  let completion = null;
  if (session.activityId && session.activity) {
    const envPresentation = await resolveActivityEnvironmentPresentation({
      athleteId,
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
