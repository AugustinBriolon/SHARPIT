'use client';

import { LocationPlaceCoordinates } from '@/components/ui/location-place-coordinates';
import { LocationPlaceResults } from '@/components/ui/location-place-results';
import { Input } from '@/components/ui/input';
import { useLocationPlacePickerState } from '@/components/ui/use-location-place-picker-state';

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
  id,
}: {
  value: LocationPlaceValue;
  onChange: (next: LocationPlaceValue) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
}) {
  const { onDraftChange, query, search, selectPlace } = useLocationPlacePickerState({
    disabled,
    onChange,
    value,
  });

  return (
    <div className="relative min-w-0 space-y-1">
      <Input
        disabled={disabled}
        id={id}
        placeholder={placeholder}
        value={query}
        onBlur={() => setTimeout(() => search.setOpen(false), 150)}
        onChange={(e) => onDraftChange(e.target.value)}
        onFocus={() => search.setOpen(true)}
      />
      {value ? <LocationPlaceCoordinates value={value} /> : null}
      {search.open ? (
        <LocationPlaceResults
          loading={search.loading}
          results={search.results}
          value={value}
          onSelect={selectPlace}
        />
      ) : null}
    </div>
  );
}
