'use client';

import { useEffect, useState } from 'react';
import type { GeocodedPlace } from '@/lib/geocoding/types';
import type { LocationPlaceValue } from '@/components/ui/location-place-picker';

export function useLocationPlaceSearch({
  disabled,
  query,
  value,
}: {
  disabled: boolean;
  query: string;
  value: LocationPlaceValue;
}) {
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (disabled) {
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 2 || (value && trimmed === value.label)) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/geocoding/search?q=${encodeURIComponent(trimmed)}`);
        const data = (await res.json()) as { places?: GeocodedPlace[] };
        setResults(data.places ?? []);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [disabled, query, value]);

  return { results, loading, open, setOpen };
}
