import type { LocationPlaceValue } from '@/components/planning/location-place-picker';
import { activityTypeLabels } from '@/lib/format';
import type { ClientGoal, ClientPlannedSession } from '@/lib/query/types';
import { ActivityType, SessionIntensity } from '@prisma/client';

export type LocationSource = 'home' | 'travel' | 'custom';

export type DialogMode = 'read' | 'edit';
export type CreateMode = 'single' | 'brick';

export type BrickLegForm = {
  type: ActivityType;
  title: string;
  description: string;
  durationMin: string;
  load: string;
  intensity: SessionIntensity;
};

export const NO_GOAL = 'none';

/** Stable empty default for goals props / `??` fallbacks. */
export const EMPTY_GOALS: ClientGoal[] = [];

export function initialCustomPlace(session?: ClientPlannedSession | null): LocationPlaceValue {
  if (session?.locationLat != null && session.locationLng != null && session.locationLabel) {
    return {
      label: session.locationLabel,
      latitude: session.locationLat,
      longitude: session.locationLng,
    };
  }
  return null;
}

export function initialLocationSource(session?: ClientPlannedSession | null): LocationSource {
  if (session?.locationLat != null && session.locationLng != null) return 'custom';
  return 'home';
}

export function defaultBrickLegs(): BrickLegForm[] {
  return [
    {
      type: 'BIKE',
      title: 'Vélo',
      description: '',
      durationMin: '',
      load: '',
      intensity: 'ENDURANCE',
    },
    {
      type: 'RUN',
      title: 'Course',
      description: '',
      durationMin: '',
      load: '',
      intensity: 'ENDURANCE',
    },
  ];
}

export function brickLegTitlePlaceholder(type: ActivityType): string {
  if (type === 'BIKE') return 'Vélo';
  if (type === 'RUN') return 'Course';
  return activityTypeLabels[type];
}

export function submitButtonLabel(
  pending: boolean,
  isEdit: boolean,
  createMode: CreateMode,
): string {
  if (pending) return 'Enregistrement…';
  if (isEdit) return 'Mettre à jour';
  if (createMode === 'brick') return 'Créer le brick';
  return 'Planifier';
}

export function dialogTitle(isEdit: boolean, mode: DialogMode, isLinked: boolean): string {
  if (!isEdit) return 'Planifier une séance';
  if (mode === 'edit') return 'Modifier la séance';
  return isLinked ? 'Séance réalisée' : 'Séance planifiée';
}
