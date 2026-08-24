import { NextRequest, NextResponse } from 'next/server';
import { syncPhysicalConditionObservation } from '@/lib/manual-observation-sync';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { createPhysicalNote, getPhysicalNotes } from '@/lib/queries';
import { createPhysicalNoteSchema } from '@/lib/validators/physical-note';

export async function GET() {
  try {
    const athleteId = await getCurrentAthleteId();
    const notes = await getPhysicalNotes(athleteId);
    return NextResponse.json(notes);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Impossible de charger les notes physiques' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const athleteId = await getCurrentAthleteId();
    const body = await request.json();
    const parsed = createPhysicalNoteSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Données invalides', details: parsed.error.flatten() },
        { status: 400 },
      );
    }
    const note = await createPhysicalNote(
      athleteId,
      parsed.data as Parameters<typeof createPhysicalNote>[1],
    );
    await syncPhysicalConditionObservation(note);
    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Impossible de créer la note' }, { status: 500 });
  }
}
