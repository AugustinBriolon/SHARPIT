'use client';

import { useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { GeocodedPlace } from '@/lib/geocoding/types';

export type LocationPlaceValue = {
  label: string;
  latitude: number;
  longitude: number;
} | null;

export function LocationPlacePicker({
  value,
  onChange,
  placeholder = 'Rechercher une ville…',
  disabled = false,
}: {
  value: LocationPlaceValue;
  onChange: (next: LocationPlaceValue) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState(value?.label ?? '');
  const [results, setResults] = useState<GeocodedPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setQuery(value?.label ?? '');
  }, [value?.label]);

  useEffect(() => {
    if (disabled) return;
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

  return (
    <div className="relative min-w-0 space-y-1">
      <Input
        disabled={disabled}
        placeholder={placeholder}
        value={query}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onFocus={() => setOpen(true)}
        onChange={(e) => {
          setQuery(e.target.value);
          if (value && e.target.value !== value.label) {
            onChange(null);
          }
        }}
      />
      {value ? (
        <p className="text-muted-foreground text-[11px]">
          Coordonnées : {value.latitude.toFixed(4)}, {value.longitude.toFixed(4)}
        </p>
      ) : null}
      {open && (loading || results.length > 0) ? (
        <ul className="border-border bg-background absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border shadow-md">
          {loading ? (
            <li className="text-muted-foreground px-3 py-2 text-xs">Recherche…</li>
          ) : (
            results.map((place) => (
              <li key={place.placeId}>
                <button
                  type="button"
                  className={cn(
                    'hover:bg-muted/60 w-full px-3 py-2 text-left text-xs',
                    value?.label === place.label && 'bg-muted/40',
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange({
                      label: place.label,
                      latitude: place.latitude,
                      longitude: place.longitude,
                    });
                    setQuery(place.label);
                    setOpen(false);
                  }}
                >
                  {place.label}
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
