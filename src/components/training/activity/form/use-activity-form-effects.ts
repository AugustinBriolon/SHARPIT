'use client';

import { useEffect } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import type { LocationPlaceValue } from '@/components/ui/location-place-picker';
import type { ActivityFormValues } from '@/components/training/activity/form/activity-form-helpers';
import { sportSupportsOutdoorContext } from '@/core/planned-session/defaults';

async function fetchWeatherPreview({
  location,
  resolvedActivityDate,
  resolvedDurationSec,
  form,
  controller,
  setWeatherLoading,
  setWeatherSummary,
}: {
  location: NonNullable<LocationPlaceValue>;
  resolvedActivityDate: Date;
  resolvedDurationSec: number | null;
  form: UseFormReturn<ActivityFormValues>;
  controller: AbortController;
  setWeatherLoading: (value: boolean) => void;
  setWeatherSummary: (value: string | null) => void;
}) {
  setWeatherLoading(true);
  try {
    const response = await fetch('/api/activities/weather-preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        latitude: location.latitude,
        longitude: location.longitude,
        label: location.label,
        date: resolvedActivityDate,
        durationSec: resolvedDurationSec,
      }),
      signal: controller.signal,
    });
    if (!response.ok) {
      return;
    }
    const data = (await response.json()) as { weather?: string | null; summary?: string | null };
    if (data.weather) {
      form.setValue('weather', data.weather);
    }
    setWeatherSummary(data.summary ?? null);
  } catch {
    // best-effort
  } finally {
    if (!controller.signal.aborted) {
      setWeatherLoading(false);
    }
  }
}

export function useActivityFormEffects({
  mode,
  form,
  location,
  setLocation,
  locationTouchedRef,
  setWeatherSummary,
  setWeatherLoading,
  resolvedActivityDate,
  resolvedDurationSec,
  activityType,
}: {
  mode: 'create' | 'edit';
  form: UseFormReturn<ActivityFormValues>;
  location: LocationPlaceValue | null;
  setLocation: (value: LocationPlaceValue | null) => void;
  locationTouchedRef: React.MutableRefObject<boolean>;
  setWeatherSummary: (value: string | null) => void;
  setWeatherLoading: (value: boolean) => void;
  resolvedActivityDate: Date;
  resolvedDurationSec: number | null;
  activityType: ActivityFormValues['type'];
}) {
  const isOutdoor = sportSupportsOutdoorContext(activityType);

  useEffect(() => () => form.clearErrors('root'), [form]);

  useEffect(() => {
    if (mode !== 'create' || locationTouchedRef.current) {
      return;
    }
    const dateIso = resolvedActivityDate.toISOString();
    void fetch(`/api/geocoding/home?date=${encodeURIComponent(dateIso)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { home?: { label: string; latitude: number; longitude: number } } | null) => {
        if (data?.home) {
          setLocation({
            label: data.home.label,
            latitude: data.home.latitude,
            longitude: data.home.longitude,
          });
        }
      })
      .catch(() => undefined);
  }, [mode, resolvedActivityDate, locationTouchedRef, setLocation]);

  useEffect(() => {
    if (!location) {
      form.setValue('observedLocationLabel', '');
      form.setValue('observedLocationLat', undefined);
      form.setValue('observedLocationLng', undefined);
      form.setValue('weather', '');
      setWeatherSummary(null);
      return;
    }
    form.setValue('observedLocationLabel', location.label);
    form.setValue('observedLocationLat', location.latitude);
    form.setValue('observedLocationLng', location.longitude);
  }, [form, location, setWeatherSummary]);

  useEffect(() => {
    if (!isOutdoor || !location) {
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetchWeatherPreview({
        location,
        resolvedActivityDate,
        resolvedDurationSec,
        form,
        controller,
        setWeatherLoading,
        setWeatherSummary,
      });
    }, 400);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [
    isOutdoor,
    location,
    resolvedActivityDate,
    resolvedDurationSec,
    form,
    setWeatherLoading,
    setWeatherSummary,
  ]);
}
