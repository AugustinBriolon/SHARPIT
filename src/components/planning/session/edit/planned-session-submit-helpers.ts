import { defaultExposureForActivityType } from '@/core/planned-session/defaults';
import { formatEndurancePrescriptionSummary } from '@/lib/planned-session/endurance/coach-endurance-prescription';
import {
  endurancePrescriptionFromDraft,
  type EnduranceDraftBlock,
} from '@/lib/planned-session/endurance/endurance-draft';
import { resolveStrengthFieldsForPersist } from '@/lib/planned-session/strength/strength-prescription';
import {
  strengthPrescriptionFromDraft,
  type StrengthPrescriptionDraftRow,
} from '@/components/planning/session/edit/strength-prescription-editor';
import type { EquipmentItemId } from '@/lib/equipment/catalog';
import type { ClientPlannedSession } from '@/lib/query/types';
import { ActivityType, SessionIntensity } from '@prisma/client';
import type {
  CreateMode,
  BrickLegForm,
} from '@/components/planning/session/edit/planned-session-dialog-helpers';
import { NO_GOAL } from '@/components/planning/session/edit/planned-session-dialog-helpers';
import { resolveLocationPayload } from '@/components/planning/session/edit/planned-session-location-helpers';
import type { LocationSource } from '@/components/planning/session/edit/planned-session-dialog-helpers';
import type { LocationPlaceValue } from '@/components/ui/location-place-picker';

export function resolveStrengthPrescriptionPayload(
  type: ActivityType,
  strengthRows: StrengthPrescriptionDraftRow[],
  description: string | null,
) {
  if (type !== ActivityType.STRENGTH) {
    return { strengthPrescription: null as null, description };
  }
  return resolveStrengthFieldsForPersist({
    type: ActivityType.STRENGTH,
    description,
    strengthPrescription: strengthPrescriptionFromDraft(strengthRows),
  });
}

export function resolveEndurancePayload(
  enduranceBlocks: EnduranceDraftBlock[],
  type: ActivityType,
  intensity: SessionIntensity,
  description: string | null,
) {
  const prescription = endurancePrescriptionFromDraft(enduranceBlocks, { type, intensity });
  if (!prescription) {
    return { endurancePrescription: null, description };
  }
  return {
    endurancePrescription: prescription,
    description: formatEndurancePrescriptionSummary(prescription),
  };
}

function parseFormMeta(formData: FormData) {
  const dateValue = String(formData.get('date') || '');
  const startTimeValue = String(formData.get('startTime') || '');
  const durationRaw = formData.get('durationMin');
  const loadRaw = formData.get('load');
  return {
    date: new Date(`${dateValue}T12:00:00`),
    startTime: startTimeValue || null,
    title: (formData.get('title') as string) || null,
    durationMin: durationRaw ? Number(durationRaw) : null,
    load: loadRaw ? Number(loadRaw) : null,
  };
}

function buildSingleSessionPayload(input: {
  formData: FormData;
  type: ActivityType;
  intensity: SessionIntensity;
  goalId: string;
  showOutdoorContext: boolean;
  exposure: 'INDOOR' | 'OUTDOOR' | 'UNKNOWN';
  locationSource: LocationSource;
  home?: { label?: string; latitude: number; longitude: number };
  travel?: { locationLabel: string; locationLat: number; locationLng: number } | null;
  customPlace: LocationPlaceValue;
  strengthRows: StrengthPrescriptionDraftRow[];
  enduranceBlocks: EnduranceDraftBlock[];
  accessories: EquipmentItemId[];
  defaultExposureType?: ActivityType;
}) {
  const descriptionRaw = (input.formData.get('description') as string) || null;
  const strength = resolveStrengthPrescriptionPayload(
    input.type,
    input.strengthRows,
    descriptionRaw,
  );
  const endurance = resolveEndurancePayload(
    input.enduranceBlocks,
    input.type,
    input.intensity,
    strength.description,
  );
  const location = resolveLocationPayload({
    showOutdoorContext: input.showOutdoorContext,
    exposure: input.exposure,
    locationSource: input.locationSource,
    home: input.home,
    travel: input.travel,
    customPlace: input.customPlace,
  });
  const meta = parseFormMeta(input.formData);

  return {
    type: input.type,
    date: meta.date,
    startTime: meta.startTime,
    title: meta.title,
    description: endurance.description,
    strengthPrescription: strength.strengthPrescription,
    endurancePrescription: endurance.endurancePrescription,
    accessories: input.accessories.length > 0 ? input.accessories : null,
    durationMin: meta.durationMin,
    load: meta.load,
    intensity: input.intensity,
    goalId: input.goalId === NO_GOAL ? null : input.goalId,
    exposureSetting: input.showOutdoorContext
      ? input.exposure
      : defaultExposureForActivityType(input.defaultExposureType ?? input.type),
    locationLabel: location.locationLabel,
    locationLat: location.locationLat,
    locationLng: location.locationLng,
  };
}

export function validateSessionDescription(
  type: ActivityType,
  description: string | null | undefined,
): string | null {
  if (type === ActivityType.STRENGTH) {
    return null;
  }
  if (!(description ?? '').trim()) {
    return 'Le déroulé de la séance est requis (description).';
  }
  return null;
}

export function validateStrengthRows(
  createMode: CreateMode,
  type: ActivityType,
  strengthRows: StrengthPrescriptionDraftRow[],
): string | null {
  if (createMode === 'single' && type === ActivityType.STRENGTH) {
    if (!strengthPrescriptionFromDraft(strengthRows)) {
      return 'Ajoute au moins un exercice pour la séance de musculation.';
    }
  }
  return null;
}

export function buildBrickCreatePayload(formData: FormData, goalId: string, legs: BrickLegForm[]) {
  const dateValue = String(formData.get('date') || '');
  const startTimeValue = String(formData.get('startTime') || '');
  return {
    date: new Date(`${dateValue}T12:00:00`),
    startTime: startTimeValue || null,
    goalId: goalId === NO_GOAL ? null : goalId,
    legs: legs.map((leg) => ({
      type: leg.type,
      title: leg.title || null,
      description: leg.description || null,
      durationMin: leg.durationMin ? Number(leg.durationMin) : null,
      load: leg.load ? Number(leg.load) : null,
      intensity: leg.intensity,
    })),
  };
}

export function buildSessionUpdateData(input: {
  formData: FormData;
  session: ClientPlannedSession;
  type: ActivityType;
  intensity: SessionIntensity;
  goalId: string;
  showOutdoorContext: boolean;
  exposure: 'INDOOR' | 'OUTDOOR' | 'UNKNOWN';
  locationSource: LocationSource;
  home?: { label?: string; latitude: number; longitude: number };
  travel?: { locationLabel: string; locationLat: number; locationLng: number } | null;
  customPlace: LocationPlaceValue;
  strengthRows: StrengthPrescriptionDraftRow[];
  enduranceBlocks: EnduranceDraftBlock[];
  accessories: EquipmentItemId[];
}) {
  return buildSingleSessionPayload({
    formData: input.formData,
    type: input.type,
    intensity: input.intensity,
    goalId: input.goalId,
    showOutdoorContext: input.showOutdoorContext,
    exposure: input.exposure,
    locationSource: input.locationSource,
    home: input.home,
    travel: input.travel,
    customPlace: input.customPlace,
    strengthRows: input.strengthRows,
    enduranceBlocks: input.enduranceBlocks,
    accessories: input.accessories,
    defaultExposureType: input.type,
  });
}

export function buildSessionCreateData(
  input: Omit<Parameters<typeof buildSingleSessionPayload>[0], 'defaultExposureType'>,
) {
  return buildSingleSessionPayload(input);
}
