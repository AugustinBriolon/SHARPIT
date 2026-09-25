'use client';

import { Loader2 } from 'lucide-react';

export function ActivityFormWeatherHint({
  weatherLoading,
  weatherSummary,
  hasLocation,
}: {
  weatherLoading: boolean;
  weatherSummary: string | null;
  hasLocation: boolean;
}) {
  if (weatherLoading) {
    return (
      <>
        <Loader2 className="size-3.5 animate-spin" />
        Récupération de la météo…
      </>
    );
  }
  if (weatherSummary) {
    return <span>Météo estimée : {weatherSummary}</span>;
  }
  if (hasLocation) {
    return <span>La météo sera calculée à partir du lieu et de l&apos;horaire.</span>;
  }
  return null;
}
