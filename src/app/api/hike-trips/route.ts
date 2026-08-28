import { NextRequest, NextResponse } from 'next/server';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import {
  createHikeTrip,
  HikeTripConflictError,
  HikeTripValidationError,
  listHikeTrips,
} from '@/lib/queries';
import { createHikeTripSchema } from '@/lib/validators/hike-trip';

function isTripNotFoundMessage(message: string): boolean {
  return message.includes('Dossier introuvable');
}

function hikeTripErrorResponse(error: unknown, fallbackMessage: string): NextResponse {
  if (error instanceof HikeTripConflictError) {
    return NextResponse.json(
      {
        error: error.message,
        ...(error.tripId !== null ? { tripId: error.tripId } : {}),
        ...(error.tripName !== null ? { tripName: error.tripName } : {}),
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

export async function GET() {
  try {
    const athleteId = await getCurrentAthleteId();
    const trips = await listHikeTrips(athleteId);
    return NextResponse.json(trips);
  } catch (error) {
    return hikeTripErrorResponse(error, 'Impossible de charger les séjours');
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = createHikeTripSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }

    const athleteId = await getCurrentAthleteId();
    const trip = await createHikeTrip(athleteId, parsed.data);
    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    return hikeTripErrorResponse(error, 'Impossible de créer le séjour');
  }
}
