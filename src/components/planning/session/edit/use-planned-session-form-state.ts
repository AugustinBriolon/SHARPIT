'use client';

import {
  defaultExposureForActivityType,
  sportSupportsOutdoorContext,
} from '@/core/planned-session/defaults';
import { enduranceSportFromActivityType } from '@/lib/planned-session/endurance/endurance-prescription';
import type { EnduranceDraftBlock } from '@/lib/planned-session/endurance/endurance-draft';
import type { ClientPlannedSession } from '@/lib/query/types';
import { ActivityType, SessionIntensity } from '@prisma/client';
import { useState } from 'react';
import type { LocationPlaceValue } from '@/components/ui/location-place-picker';
import type { StrengthPrescriptionDraftRow } from '@/components/planning/session/edit/strength-prescription-editor';
import type {
  BrickLegForm,
  CreateMode,
  DialogMode,
  LocationSource,
} from '@/components/planning/session/edit/planned-session-dialog-helpers';
import {
  createPlannedSessionFormState,
  sessionFormSnapshot,
} from '@/components/planning/session/edit/planned-session-form-snapshot';

export function usePlannedSessionFormState(
  session?: ClientPlannedSession | null,
  defaultDate?: Date,
) {
  const initial = createPlannedSessionFormState(session);
  const [mode, setMode] = useState<DialogMode>(initial.mode);
  const [formKey, setFormKey] = useState(initial.formKey);
  const [createMode, setCreateMode] = useState<CreateMode>(initial.createMode);
  const [type, setType] = useState<ActivityType>(initial.type);
  const [intensity, setIntensity] = useState<SessionIntensity>(initial.intensity);
  const [goalId, setGoalId] = useState<string>(initial.goalId);
  const [exposure, setExposure] = useState<'INDOOR' | 'OUTDOOR' | 'UNKNOWN'>(initial.exposure);
  const [locationSource, setLocationSource] = useState<LocationSource>(initial.locationSource);
  const [customPlace, setCustomPlace] = useState<LocationPlaceValue>(initial.customPlace);
  const [legs, setLegs] = useState<BrickLegForm[]>(initial.legs);
  const [strengthRows, setStrengthRows] = useState<StrengthPrescriptionDraftRow[]>(
    initial.strengthRows,
  );
  const [enduranceBlocks, setEnduranceBlocks] = useState<EnduranceDraftBlock[]>(
    initial.enduranceBlocks,
  );
  const [accessories, setAccessories] = useState(initial.accessories);
  const [error, setError] = useState<string | null>(initial.error);

  const enduranceSport = enduranceSportFromActivityType(type);
  const initialDate = session?.date ? new Date(session.date) : (defaultDate ?? new Date());
  const showOutdoorContext = createMode === 'single' && sportSupportsOutdoorContext(type);

  function selectActivityType(next: ActivityType) {
    setType(next);
    if (next === ActivityType.STRENGTH) {
      setExposure('INDOOR');
    }
  }

  function resetFormFromSession() {
    if (!session) {
      return;
    }
    const snapshot = sessionFormSnapshot(session);
    setType(snapshot.type);
    setIntensity(snapshot.intensity);
    setGoalId(snapshot.goalId);
    setExposure(snapshot.exposure);
    setLocationSource(snapshot.locationSource);
    setCustomPlace(snapshot.customPlace);
    setStrengthRows(snapshot.strengthRows);
    setEnduranceBlocks(snapshot.enduranceBlocks);
    setAccessories(snapshot.accessories);
  }

  function handleStartEdit() {
    resetFormFromSession();
    setFormKey((k) => k + 1);
    setMode('edit');
  }

  function handleCancelEdit() {
    setError(null);
    resetFormFromSession();
    setFormKey((k) => k + 1);
    setMode('read');
  }

  function updateLeg(index: number, patch: Partial<BrickLegForm>) {
    setLegs((prev) => prev.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)));
  }

  function addLeg() {
    setLegs((prev) => [
      ...prev,
      {
        type: 'RUN',
        title: '',
        description: '',
        durationMin: '',
        load: '',
        intensity: 'ENDURANCE',
      },
    ]);
  }

  function removeLeg(index: number) {
    setLegs((prev) => prev.filter((_, i) => i !== index));
  }

  return {
    isEdit: initial.isEdit,
    mode,
    setMode,
    formKey,
    createMode,
    setCreateMode,
    type,
    intensity,
    setIntensity,
    goalId,
    setGoalId,
    exposure,
    setExposure,
    locationSource,
    setLocationSource,
    customPlace,
    setCustomPlace,
    legs,
    strengthRows,
    setStrengthRows,
    enduranceBlocks,
    setEnduranceBlocks,
    accessories,
    setAccessories,
    error,
    setError,
    enduranceSport,
    initialDate,
    showOutdoorContext,
    selectActivityType,
    handleStartEdit,
    handleCancelEdit,
    updateLeg,
    addLeg,
    removeLeg,
  };
}
