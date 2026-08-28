import { ActivityType } from '@prisma/client';
import type { LocationPlaceValue } from '@/components/ui/location-place-picker';
import { sportSupportsOutdoorContext } from '@/core/planned-session/defaults';
import { createActivitySchema } from '@/lib/validators/activity';
import { z } from 'zod';

export type ActivityFormValues = z.input<typeof createActivitySchema>;

export type ActivityWithRelations = {
  id: string;
  type: ActivityType;
  date: Date;
  title: string | null;
  duration: number | null;
  rpe: number | null;
  feeling: string | null;
  notes: string | null;
  weather: string | null;
  load: number | null;
  observedLocationLabel: string | null;
  observedLocationLat: number | null;
  observedLocationLng: number | null;
  runMetrics: Record<string, unknown> | null;
  bikeMetrics: Record<string, unknown> | null;
  swimMetrics: Record<string, unknown> | null;
  strengthSets: Array<Record<string, unknown>>;
};

export interface ActivityFormProps {
  mode: 'create' | 'edit';
  initialData?: ActivityWithRelations;
}

export const defaultStrengthSet = {
  exercise: '',
  sets: 3,
  reps: 8,
  weightKg: undefined,
  rpe: undefined,
  restSec: 90,
  videoUrl: '',
  notes: '',
};

export const ACTIVITY_FEELING_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Très bien', label: 'Très bien' },
  { value: 'Bien', label: 'Bien' },
  { value: 'Correct', label: 'Correct' },
  { value: 'Mal', label: 'Mal' },
  { value: 'Très mal', label: 'Très mal' },
];

export function strengthSetsForForm(initialData: ActivityWithRelations) {
  if (initialData.type !== ActivityType.STRENGTH) {
    return [];
  }
  return initialData.strengthSets.length ? initialData.strengthSets : [defaultStrengthSet];
}

export function resolveWatchedDate(value: unknown): Date {
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return new Date(value);
  }
  return new Date();
}

export function resolveWatchedDurationSec(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function resolveWatchedRpe(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function emptyToUndefined(value: unknown) {
  if (value === '' || value === null || value === undefined) {
    return undefined;
  }
  if (typeof value === 'number' && Number.isNaN(value)) {
    return undefined;
  }
  return value;
}

export function sanitizeActivityPayload(values: ActivityFormValues): ActivityFormValues {
  const payload: ActivityFormValues = {
    ...values,
    title: values.title || undefined,
    feeling: values.feeling || undefined,
    notes: values.notes || undefined,
    weather: values.weather || undefined,
    observedLocationLabel: values.observedLocationLabel || undefined,
    observedLocationLat: emptyToUndefined(values.observedLocationLat) as number | undefined,
    observedLocationLng: emptyToUndefined(values.observedLocationLng) as number | undefined,
    duration: emptyToUndefined(values.duration) as number | undefined,
    rpe: emptyToUndefined(values.rpe) as number | undefined,
    load: emptyToUndefined(values.load) as number | undefined,
  };

  if (!sportSupportsOutdoorContext(payload.type)) {
    delete payload.observedLocationLabel;
    delete payload.observedLocationLat;
    delete payload.observedLocationLng;
    delete payload.weather;
  }

  if (payload.type !== ActivityType.STRENGTH) {
    delete payload.strengthSets;
  }

  return payload;
}

export function initialLocationFromData(data?: ActivityWithRelations): LocationPlaceValue {
  if (
    data?.observedLocationLat !== null &&
    data.observedLocationLng !== null &&
    data.observedLocationLabel
  ) {
    return {
      label: data.observedLocationLabel,
      latitude: data.observedLocationLat,
      longitude: data.observedLocationLng,
    };
  }
  return null;
}

export function formatValidationErrors(errors: Record<string, unknown>): string {
  const messages: string[] = [];

  function walk(node: unknown, path: string) {
    if (!node || typeof node !== 'object') {
      return;
    }
    const record = node as Record<string, unknown>;
    if (typeof record.message === 'string') {
      messages.push(path ? `${path} : ${record.message}` : record.message);
    }
    for (const [key, value] of Object.entries(record)) {
      if (key === 'message' || key === 'type' || key === 'ref') {
        continue;
      }
      walk(value, path ? `${path}.${key}` : key);
    }
  }

  walk(errors, '');
  return messages[0] ?? 'Vérifie les champs du formulaire.';
}
