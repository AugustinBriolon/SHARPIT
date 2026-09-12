/**
 * Re-reads what is *already planned* against the zones the athlete protects.
 *
 * Naming the zones in the prompt and checking the model's answer only helps the
 * sessions generated after the injury was declared. A week built last Sunday
 * keeps its squats, and nothing ever says so. This audit runs on read, over
 * data the client already holds, so declaring an injury changes what the
 * athlete sees about their existing plan immediately — no regeneration, no
 * model call, no migration.
 *
 * Pure: no I/O, no React.
 */

import { resolveStrengthSetMedia } from '@/lib/exercises/resolve';
import { parseStrengthPrescription } from '@/lib/planned-session/strength/strength-prescription';
import { exerciseZoneConflict, type SensitiveZone } from '@/lib/physical-health/sensitive-zones';

export type AuditableSession = {
  id: string;
  date: Date | string;
  title?: string | null;
  completed?: boolean | null;
  /** Raw JSON as stored — parsed here so callers need not. */
  strengthPrescription?: unknown;
};

export type SessionZoneFlag = {
  exercise: string;
  zone: SensitiveZone;
};

export type SessionZoneAudit = {
  sessionId: string;
  sessionTitle: string | null;
  date: Date;
  flags: SessionZoneFlag[];
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Exercises in this session that load a protected zone. */
export function sessionZoneFlags(
  session: AuditableSession,
  zones: readonly SensitiveZone[],
): SessionZoneFlag[] {
  if (zones.length === 0) {
    return [];
  }
  const prescription = parseStrengthPrescription(session.strengthPrescription);
  if (!prescription) {
    return [];
  }
  return prescription.sets.flatMap((set) => {
    const media = resolveStrengthSetMedia(set);
    const zone = exerciseZoneConflict(media?.bodyPart, zones);
    return zone ? [{ exercise: set.exercise, zone }] : [];
  });
}

/**
 * Sessions still ahead that load a protected zone. Completed ones are history:
 * warning about them would be noise the athlete can do nothing with.
 */
export function auditUpcomingSessions(input: {
  sessions: readonly AuditableSession[];
  zones: readonly SensitiveZone[];
  now: Date;
}): SessionZoneAudit[] {
  if (input.zones.length === 0) {
    return [];
  }
  const from = input.now.getTime();
  return input.sessions
    .filter((session) => !session.completed && toDate(session.date).getTime() >= from)
    .map((session) => ({
      sessionId: session.id,
      sessionTitle: session.title ?? null,
      date: toDate(session.date),
      flags: sessionZoneFlags(session, input.zones),
    }))
    .filter((audit) => audit.flags.length > 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}

/** How many upcoming sessions load this particular zone. */
export function countSessionsLoadingZone(
  audits: readonly SessionZoneAudit[],
  zoneLabel: string,
): number {
  return audits.filter((audit) => audit.flags.some((flag) => flag.zone.label === zoneLabel)).length;
}

/** One line the athlete reads on the condition itself. */
export function zoneAuditLabel(count: number): string | null {
  if (count <= 0) {
    return null;
  }
  return count === 1
    ? '1 séance à venir charge cette zone'
    : `${count} séances à venir chargent cette zone`;
}
