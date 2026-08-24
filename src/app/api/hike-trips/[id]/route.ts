import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import {
  deleteHikeTrip,
  getHikeTripById,
  HikeTripConflictError,
  HikeTripValidationError,
  updateHikeTrip,
} from '@/lib/queries';
import { patchHikeTripSchema } from '@/lib/validators/hike-trip';

type RouteContext = { params: Promise<{ id: string }> };

function isTripNotFoundMessage(message: string): boolean {
  return message.includes('Dossier introuvable');
}

function hikeTripErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  if (error instanceof HikeTripConflictError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.tripId != null ? { tripId: error.tripId } : {}),
        ...(error.tripName != null ? { tripName: error.tripName } : {}),
      },
      { status: 409 },
    );
  }

  if (error instanceof HikeTripValidationError) {
    const status = isTripNotFoundMessage(error.message) ? 404 : 400;
    return NextResponse.json({ error: error.message }, { status });
  }

  console.error(error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const athleteId = await getCurrentAthleteId();
    const trip = await getHikeTripById(athleteId, id);

    if (!trip) {
      return NextResponse.json({ error: 'Dossier introuvable' }, { status: 404 });
    }

    return NextResponse.json(trip);
  } catch (error) {
    return hikeTripErrorResponse(error, 'Impossible de charger le séjour');
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const parsed = patchHikeTripSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const athleteId = await getCurrentAthleteId();
    const trip = await updateHikeTrip(athleteId, id, parsed.data);
    return NextResponse.json(trip);
  } catch (error) {
    return hikeTripErrorResponse(error, 'Impossible de mettre à jour le séjour');
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const athleteId = await getCurrentAthleteId();
    await deleteHikeTrip(athleteId, id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return hikeTripErrorResponse(error, 'Impossible de supprimer le séjour');
  }
}
