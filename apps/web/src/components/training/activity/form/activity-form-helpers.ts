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

export { ACTIVITY_FEELING_OPTIONS } from '@/lib/activity/feeling/activity-feeling-scale';

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
  if (!data?.observedLocationLabel) {
    return null;
  }
  const { observedLocationLabel: label, observedLocationLat: lat, observedLocationLng: lng } = data;
  if (lat === null || lat === undefined || lng === null || lng === undefined) {
    return null;
  }
  return { label, latitude: lat, longitude: lng };
}

function pushRecordMessage(record: Record<string, unknown>, path: string, messages: string[]) {
  if (typeof record.message === 'string') {
    messages.push(path ? `${path} : ${record.message}` : record.message);
  }
}

function walkValidationChildren(record: Record<string, unknown>, path: string, messages: string[]) {
  for (const [key, value] of Object.entries(record)) {
    if (key === 'message' || key === 'type' || key === 'ref') {
      continue;
    }
    collectValidationMessages(value, path ? `${path}.${key}` : key, messages);
  }
}

function collectValidationMessages(node: unknown, path: string, messages: string[]) {
  if (!node || typeof node !== 'object') {
    return;
  }
  const record = node as Record<string, unknown>;
  pushRecordMessage(record, path, messages);
  walkValidationChildren(record, path, messages);
}

export function formatValidationErrors(errors: Record<string, unknown>): string {
  const messages: string[] = [];
  collectValidationMessages(errors, '', messages);
  return messages[0] ?? 'Vérifie les champs du formulaire.';
}

function mapInitialDataCoreFields(initialData: ActivityWithRelations) {
  return {
    type: initialData.type,
    date: new Date(initialData.date),
    title: initialData.title ?? '',
    duration: initialData.duration ?? undefined,
    rpe: initialData.rpe ?? undefined,
    feeling: initialData.feeling ?? '',
    notes: initialData.notes ?? '',
    weather: initialData.weather ?? '',
  };
}

function mapInitialDataLocationFields(initialData: ActivityWithRelations) {
  return {
    observedLocationLabel: initialData.observedLocationLabel ?? '',
    observedLocationLat: initialData.observedLocationLat ?? undefined,
    observedLocationLng: initialData.observedLocationLng ?? undefined,
    load: initialData.load ?? undefined,
  };
}

function mapInitialDataMetricsFields(initialData: ActivityWithRelations) {
  return {
    runMetrics: initialData.runMetrics ?? undefined,
    bikeMetrics: initialData.bikeMetrics ?? undefined,
    swimMetrics: initialData.swimMetrics ?? undefined,
    strengthSets: strengthSetsForForm(initialData),
  };
}

export function mapInitialDataToFormValues(initialData: ActivityWithRelations): ActivityFormValues {
  return {
    ...mapInitialDataCoreFields(initialData),
    ...mapInitialDataLocationFields(initialData),
    ...mapInitialDataMetricsFields(initialData),
  } as ActivityFormValues;
}

export function buildActivityFormDefaultValues(
  initialData?: ActivityWithRelations,
): ActivityFormValues {
  if (!initialData) {
    return {
      type: ActivityType.RUN,
      date: new Date(),
      strengthSets: [defaultStrengthSet],
    };
  }
  return mapInitialDataToFormValues(initialData);
}
