/**
 * Legacy PhysicalNote / PhysicalCheckin → Physical Health domain mapping.
 * Pure functions — used by migration and tests.
 */

import type {
  ConditionScope,
  ConditionStatus,
  ConditionType,
  EpisodeStatus,
  FunctionalImpact,
  ObservationContext,
} from './types';

export type LegacyPhysicalCategory = 'PAIN' | 'INJURY' | 'MOBILITY' | 'POSTURE' | 'OTHER';

export type LegacyPhysicalStatus = 'ACTIVE' | 'MONITORING' | 'RESOLVED';

const SYSTEMIC_BODY_REGION_PATTERNS = [
  /^global$/i,
  /^général$/i,
  /^general$/i,
  /^posture$/i,
  /^mobilité$/i,
  /^mobilite$/i,
  /^corps entier$/i,
  /^whole body$/i,
  /^asymétrie$/i,
  /^asymetrie$/i,
];

export function mapLegacyCategoryToConditionType(category: LegacyPhysicalCategory): ConditionType {
  switch (category) {
    case 'PAIN':
      return 'PAIN';
    case 'INJURY':
      return 'INJURY';
    case 'MOBILITY':
      return 'MOBILITY_LIMITATION';
    case 'POSTURE':
      return 'POSTURE_ISSUE';
    case 'OTHER':
      return 'OTHER';
    default:
      return 'OTHER';
  }
}

export function mapLegacyStatusToConditionStatus(status: LegacyPhysicalStatus): ConditionStatus {
  switch (status) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'MONITORING':
      return 'STABLE';
    case 'RESOLVED':
      return 'RESOLVED';
    default:
      return 'ACTIVE';
  }
}

export function mapLegacyStatusToEpisodeStatus(status: LegacyPhysicalStatus): EpisodeStatus {
  switch (status) {
    case 'ACTIVE':
      return 'ACTIVE';
    case 'MONITORING':
      return 'STABLE';
    case 'RESOLVED':
      return 'RESOLVED';
    default:
      return 'ACTIVE';
  }
}

export function resolveConditionScope(
  type: ConditionType,
  bodyPart: string | null | undefined,
): ConditionScope {
  if (!bodyPart?.trim()) {
    return type === 'MOBILITY_LIMITATION' || type === 'POSTURE_ISSUE' ? 'SYSTEMIC' : 'LOCALIZED';
  }

  const normalized = bodyPart.trim();
  if (SYSTEMIC_BODY_REGION_PATTERNS.some((p) => p.test(normalized))) {
    return 'SYSTEMIC';
  }

  return 'LOCALIZED';
}

export function resolveBodyRegion(
  scope: ConditionScope,
  bodyPart: string | null | undefined,
  title: string,
  type: ConditionType,
): string {
  if (bodyPart?.trim()) return bodyPart.trim();

  if (scope === 'SYSTEMIC') {
    if (type === 'POSTURE_ISSUE') return 'Posture générale';
    if (type === 'MOBILITY_LIMITATION') return 'Mobilité générale';
    return 'Condition générale';
  }

  return title.trim() || 'Zone non précisée';
}

/**
 * Infer symptom presence from legacy check-in severity.
 * severity 0 → asymptomatic at that moment (not resolved).
 */
export function inferSymptomPresentFromLegacySeverity(
  severity: number | null | undefined,
): boolean {
  if (severity == null) return true;
  return severity > 0;
}

export function inferFunctionalImpactFromLegacySeverity(
  severity: number | null | undefined,
): FunctionalImpact | null {
  if (severity == null) return null;
  if (severity === 0) return 'NONE';
  if (severity <= 3) return 'MILD';
  if (severity <= 6) return 'MODERATE';
  if (severity <= 8) return 'LIMITING';
  return 'STOPPED';
}

export function inferTrainingCapacityFromSeverity(
  severity: number | null | undefined,
): import('./types').TrainingCapacityLevel {
  if (severity == null) return 'REDUCED';
  if (severity === 0) return 'FULL';
  if (severity <= 3) return 'REDUCED';
  if (severity <= 6) return 'LIMITED';
  return 'UNABLE';
}

/**
 * Classify legacy check-in context when a matching post-session reassessment exists.
 */
export function resolveLegacyCheckinContext(input: {
  checkinDate: Date;
  analyzedAt: Date | null;
  activityDate: Date | null;
  reassessmentNoteIds: string[];
  noteId: string;
}): ObservationContext {
  const { checkinDate, analyzedAt, activityDate, reassessmentNoteIds, noteId } = input;

  if (
    analyzedAt &&
    activityDate &&
    reassessmentNoteIds.includes(noteId) &&
    (checkinDate.toDateString() === activityDate.toDateString() || checkinDate >= analyzedAt) &&
    Math.abs(checkinDate.getTime() - activityDate.getTime()) <= 48 * 60 * 60 * 1000
  ) {
    return 'AFTER_SESSION';
  }

  return 'MANUAL';
}
