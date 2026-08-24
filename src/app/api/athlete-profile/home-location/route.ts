import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getCurrentAthleteId } from '@/lib/auth/current-athlete';
import { reverseGeocode } from '@/lib/geocoding/nominatim';
import { upsertAthleteProfile } from '@/lib/queries';

/**
 * Persist the athlete's base location from a device reading.
 *
 * Deliberately explicit: the browser position is written only when the athlete
 * asks for it. Nothing here runs on its own, and the coordinates never leave the
 * athlete's own database — reverse geocoding sends them to Nominatim solely to
 * turn them into a city name.
 */
const bodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
});

export async function POST(request: NextRequest) {
  try {
    const parsed = bodySchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: 'Coordonnées invalides' }, { status: 400 });
    }

    const { latitude, longitude } = parsed.data;
    // A failed lookup must not lose the coordinates: they are the useful part.
    const place = await reverseGeocode(latitude, longitude).catch(() => null);

    const athleteId = await getCurrentAthleteId();
    const profile = await upsertAthleteProfile(athleteId, {
      homeLocationLat: latitude,
      homeLocationLng: longitude,
      homeLocationLabel: place?.label ?? null,
    });

    return NextResponse.json({
      latitude,
      longitude,
      label: profile.homeLocationLabel,
    });
  } catch (error) {
    console.error('[athlete-profile/home-location]', error);
    return NextResponse.json({ error: 'Impossible d’enregistrer la position' }, { status: 500 });
  }
}
