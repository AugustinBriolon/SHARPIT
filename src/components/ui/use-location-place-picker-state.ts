'use client';

import { useEffect, useState } from 'react';
import type { GeocodedPlace } from '@/lib/geocoding/types';
import {
  handleLocationDraftChange,
  toLocationPlaceValue,
} from '@/components/ui/location-place-picker-helpers';
import { useLocationPlaceSearch } from '@/components/ui/use-location-place-search';
import type { LocationPlaceValue } from '@/components/ui/location-place-picker';

export function useLocationPlacePickerState({
  disabled,
  onChange,
  value,
}: {
  disabled: boolean;
  onChange: (next: LocationPlaceValue) => void;
  value: LocationPlaceValue;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const query = draft ?? value?.label ?? '';
  const search = useLocationPlaceSearch({ disabled, query, value });

  useEffect(() => {
    setDraft(null);
  }, [value?.label]);

  function selectPlace(place: GeocodedPlace) {
    onChange(toLocationPlaceValue(place));
    setDraft(null);
    search.setOpen(false);
  }

  function onDraftChange(nextValue: string) {
    handleLocationDraftChange({ nextValue, current: value, onChange, setDraft });
  }

  return { onDraftChange, query, search, selectPlace };
}
