/**
 * Pure helpers — visual before→after labels for PlanAdapter change rows.
 */

import type { AdaptChange } from '@/hooks/use-coach';
import type { ClientPlannedSession } from '@/lib/query/types';
import { activityTypeLabels, formatDate } from '@/lib/format';
import { formatPlannedDuration, intensityLabels } from '@/lib/planned-session/sessions';

export type AdaptDiffSide = {
  dateLabel: string;
  title: string;
  meta: string;
};

export type AdaptChangeDiffView = {
  action: AdaptChange['action'];
  before: AdaptDiffSide | null;
  after: AdaptDiffSide | null;
  dateShifted: boolean;
};

function joinMeta(parts: Array<string | null | undefined>): string {
  return parts.filter(Boolean).join(' · ');
}

function sessionSide(session: ClientPlannedSession): AdaptDiffSide {
  return {
    dateLabel: formatDate(session.date),
    title: session.title?.trim() || activityTypeLabels[session.type],
    meta: joinMeta([
      activityTypeLabels[session.type],
      session.intensity ? intensityLabels[session.intensity] : null,
      formatPlannedDuration(session.durationMin),
    ]),
  };
}

function changeTitle(change: AdaptChange): string {
  if (change.title?.trim()) {
    return change.title.trim();
  }
  if (change.type) {
    return activityTypeLabels[change.type];
  }
  return 'Séance';
}

function changeMeta(change: AdaptChange): string {
  return (
    joinMeta([
      change.type ? activityTypeLabels[change.type] : null,
      change.intensity ? intensityLabels[change.intensity] : null,
      change.durationMin !== null && change.durationMin !== undefined
        ? formatPlannedDuration(change.durationMin)
        : null,
    ]) || 'Proposition coach'
  );
}

function changeSide(change: AdaptChange, fallbackDate?: Date | string | null): AdaptDiffSide {
  const dateValue = change.date ?? fallbackDate ?? null;
  return {
    dateLabel: dateValue ? formatDate(dateValue) : '—',
    title: changeTitle(change),
    meta: changeMeta(change),
  };
}

function existingDateIso(existing: ClientPlannedSession | null): string | null {
  if (!existing?.date) {
    return null;
  }
  const d = existing.date instanceof Date ? existing.date : new Date(existing.date);
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function isDateShifted(existing: ClientPlannedSession | null, change: AdaptChange): boolean {
  const beforeDay = existingDateIso(existing);
  const afterDay = change.date ? change.date.slice(0, 10) : beforeDay;
  return Boolean(beforeDay && afterDay && beforeDay !== afterDay);
}

function removeDiff(
  change: AdaptChange,
  existing: ClientPlannedSession | null,
): AdaptChangeDiffView {
  return {
    action: 'REMOVE',
    before: existing ? sessionSide(existing) : changeSide(change),
    after: null,
    dateShifted: false,
  };
}

function addDiff(change: AdaptChange): AdaptChangeDiffView {
  return {
    action: 'ADD',
    before: null,
    after: changeSide(change),
    dateShifted: false,
  };
}

function modifyDiff(
  change: AdaptChange,
  existing: ClientPlannedSession | null,
): AdaptChangeDiffView {
  return {
    action: 'MODIFY',
    before: existing ? sessionSide(existing) : null,
    after: changeSide(change, existing?.date ?? null),
    dateShifted: isDateShifted(existing, change),
  };
}

/**
 * Build a visual before→after pair for one AdaptChange.
 * REMOVE → before only; ADD → after only; MODIFY → both (highlight date shift).
 */
export function buildAdaptChangeDiff(
  change: AdaptChange,
  existing: ClientPlannedSession | null,
): AdaptChangeDiffView {
  if (change.action === 'REMOVE') {
    return removeDiff(change, existing);
  }
  if (change.action === 'ADD') {
    return addDiff(change);
  }
  return modifyDiff(change, existing);
}
