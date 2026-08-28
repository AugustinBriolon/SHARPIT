import { defaultExposureForActivityType } from '@/core/planned-session/defaults';
import type { ClientPlannedSession } from '@/lib/query/types';
import { ActivityType, SessionIntensity } from '@prisma/client';
import {
  defaultBrickLegs,
  initialCustomPlace,
  initialLocationSource,
  NO_GOAL,
  type BrickLegForm,
  type CreateMode,
  type DialogMode,
  type LocationSource,
} from '@/components/planning/session/edit/planned-session-dialog-helpers';
import type { LocationPlaceValue } from '@/components/ui/location-place-picker';
import type { StrengthPrescriptionDraftRow } from '@/components/planning/session/edit/strength-prescription-editor';
import type { EnduranceDraftBlock } from '@/lib/planned-session/endurance/endurance-draft';
import type { EquipmentItemId } from '@/lib/equipment/catalog';
import { draftFromEndurancePrescription } from '@/lib/planned-session/endurance/endurance-draft';
import { parseEndurancePrescription } from '@/lib/planned-session/endurance/endurance-prescription';
import { parseSessionAccessories } from '@/lib/planned-session/accessories/session-accessories';
import {
  draftFromStrengthPrescription,
  parseStrengthPrescription,
} from '@/lib/planned-session/strength/strength-prescription';

const EMPTY_FORM = {
  formKey: 0,
  createMode: 'single' as CreateMode,
  type: 'RUN' as ActivityType,
  intensity: 'ENDURANCE' as SessionIntensity,
  goalId: NO_GOAL,
  exposure: defaultExposureForActivityType('RUN') as 'INDOOR' | 'OUTDOOR' | 'UNKNOWN',
  locationSource: 'home' as LocationSource,
  customPlace: null as LocationPlaceValue,
  legs: defaultBrickLegs() as BrickLegForm[],
  strengthRows: [] as StrengthPrescriptionDraftRow[],
  enduranceBlocks: [] as EnduranceDraftBlock[],
  accessories: [] as EquipmentItemId[],
  error: null as string | null,
};

export function sessionFormSnapshot(session: ClientPlannedSession) {
  return {
    type: session.type,
    intensity: session.intensity ?? 'ENDURANCE',
    goalId: session.goalId ?? NO_GOAL,
    exposure:
      (session.exposureSetting as 'INDOOR' | 'OUTDOOR' | 'UNKNOWN' | null | undefined) ??
      defaultExposureForActivityType(session.type),
    locationSource: initialLocationSource(session),
    customPlace: initialCustomPlace(session),
    strengthRows: draftFromStrengthPrescription(
      parseStrengthPrescription(session.strengthPrescription),
    ),
    enduranceBlocks: draftFromEndurancePrescription(
      parseEndurancePrescription(session.endurancePrescription),
    ),
    accessories: parseSessionAccessories(session.accessories),
  };
}

export function createPlannedSessionFormState(session?: ClientPlannedSession | null) {
  if (!session) {
    return { isEdit: false, mode: 'edit' as DialogMode, ...EMPTY_FORM };
  }
  return {
    isEdit: true,
    mode: 'read' as DialogMode,
    ...EMPTY_FORM,
    ...sessionFormSnapshot(session),
  };
}
