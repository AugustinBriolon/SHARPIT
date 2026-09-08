/**
 * Athlete activity status — longer-lived mode, independent of the day journal.
 * Local persistence until a Core observation path exists.
 *
 * Presentation impact (not Core): Today reminders, planning chrome, coach discuss labels.
 *
 * Retention: keep until the athlete changes it, or until an end date (then back to Actif).
 * Pause may optionally link to a travel / déplacement.
 */

export const ACTIVITY_STATUS_IDS = ['active', 'paused', 'injured', 'sick'] as const;

export type ActivityStatusId = (typeof ACTIVITY_STATUS_IDS)[number];

export const ACTIVITY_STATUS_DEFAULT: ActivityStatusId = 'active';

export type ActivityStatusRetentionKind = 'until_modified' | 'until_date';

export type ActivityStatusRetention =
  { kind: 'until_modified' } | { kind: 'until_date'; untilDate: string };

export type ActivityStatusOption = {
  id: ActivityStatusId;
  label: string;
  hint: string;
  /** How planning / coach should bias while this mode is on. */
  planningImpact: string;
};

export const ACTIVITY_STATUS_OPTIONS: readonly ActivityStatusOption[] = [
  {
    id: 'active',
    label: 'Actif',
    hint: 'En routine d’entraînement',
    planningImpact: 'Charge et séances suivent le plan.',
  },
  {
    id: 'paused',
    label: 'En pause',
    hint: 'Pause dans l’entraînement',
    planningImpact: 'Pas de charge volontaire — plan en veille jusqu’à reprise.',
  },
  {
    id: 'injured',
    label: 'Blessé',
    hint: 'En convalescence après une blessure',
    planningImpact: 'Priorité sécurité — adapter ou reporter les séances à risque.',
  },
  {
    id: 'sick',
    label: 'Malade',
    hint: 'Repos pour cause de maladie',
    planningImpact: 'Repos avant la charge — reprendre seulement quand le corps suit.',
  },
] as const;

export const ACTIVITY_STATUS_STORAGE_KEY = 'sharpit.activityStatus.v2';
/** Legacy key — migrated on first read. */
const ACTIVITY_STATUS_STORAGE_KEY_V1 = 'sharpit.activityStatus.v1';

export type ActivityStatusStore = {
  version: 2;
  status: ActivityStatusId;
  retention: ActivityStatusRetention;
  /** Optional travel context id when status is paused. */
  travelId: string | null;
  updatedAt: string;
};

export type ActivityStatusWriteInput = {
  status: ActivityStatusId;
  retention?: ActivityStatusRetention;
  travelId?: string | null;
};

const STATUS_SET = new Set<string>(ACTIVITY_STATUS_IDS);
const listeners = new Set<() => void>();

export function isActivityStatus(value: string): value is ActivityStatusId {
  return STATUS_SET.has(value);
}

export function activityStatusLabel(status: ActivityStatusId): string {
  return ACTIVITY_STATUS_OPTIONS.find((option) => option.id === status)?.label ?? status;
}

export function activityStatusOption(status: ActivityStatusId): ActivityStatusOption {
  return (
    ACTIVITY_STATUS_OPTIONS.find((option) => option.id === status) ?? ACTIVITY_STATUS_OPTIONS[0]!
  );
}

export function defaultRetentionForStatus(status: ActivityStatusId): ActivityStatusRetention {
  if (status === 'active') {
    return { kind: 'until_modified' };
  }
  return { kind: 'until_modified' };
}

export function activityStatusReminderFact(
  status: ActivityStatusId,
  retention?: ActivityStatusRetention,
): { label: string; value: string; hint: string } | null {
  if (status === 'active') {
    return null;
  }
  const option = activityStatusOption(status);
  const until =
    retention?.kind === 'until_date' ? ` Jusqu’au ${formatUntilDateFr(retention.untilDate)}.` : '';
  return {
    label: 'Mode',
    value: option.label,
    hint: `${option.planningImpact}${until}`,
  };
}

export function formatUntilDateFr(isoDate: string): string {
  const [year, month, day] = isoDate.split('-').map(Number);
  if (!year || !month || !day) {
    return isoDate;
  }
  return new Intl.DateTimeFormat('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function todayIsoDate(now: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(now);
}

/** Stable timestamp — never call `new Date()` in empty/server snapshots (Next prerender). */
const EMPTY_STORE_UPDATED_AT = '1970-01-01T00:00:00.000Z';

export function emptyActivityStatusStore(): ActivityStatusStore {
  return {
    version: 2,
    status: ACTIVITY_STATUS_DEFAULT,
    retention: { kind: 'until_modified' },
    travelId: null,
    updatedAt: EMPTY_STORE_UPDATED_AT,
  };
}

function normalizeRetention(raw: unknown): ActivityStatusRetention {
  if (!raw || typeof raw !== 'object') {
    return { kind: 'until_modified' };
  }
  const record = raw as { kind?: unknown; untilDate?: unknown };
  if (
    record.kind === 'until_date' &&
    typeof record.untilDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(record.untilDate)
  ) {
    return { kind: 'until_date', untilDate: record.untilDate };
  }
  return { kind: 'until_modified' };
}

function migrateLegacyStatus(rawStatus: string): ActivityStatusId {
  if (rawStatus === 'vacation') {
    return 'paused';
  }
  if (isActivityStatus(rawStatus)) {
    return rawStatus;
  }
  return ACTIVITY_STATUS_DEFAULT;
}

type ActivityStatusRawRecord = {
  version?: unknown;
  status?: unknown;
  retention?: unknown;
  travelId?: unknown;
  updatedAt?: unknown;
};

function parseActivityStatusUpdatedAt(value: unknown): string {
  return typeof value === 'string' ? value : EMPTY_STORE_UPDATED_AT;
}

function buildActivityStatusStore(
  status: ActivityStatusId,
  retention: ActivityStatusRetention,
  travelId: string | null,
  updatedAt: string,
): ActivityStatusStore {
  return {
    version: 2,
    status,
    retention,
    travelId,
    updatedAt,
  };
}

function parseActivityStatusStoreV2(record: ActivityStatusRawRecord): ActivityStatusStore | null {
  if (record.version !== 2 || typeof record.status !== 'string') {
    return null;
  }
  const status = migrateLegacyStatus(record.status);
  const retention: ActivityStatusRetention =
    status === 'active' ? { kind: 'until_modified' } : normalizeRetention(record.retention);
  const travelId =
    status === 'paused' && typeof record.travelId === 'string' ? record.travelId : null;
  return buildActivityStatusStore(
    status,
    retention,
    travelId,
    parseActivityStatusUpdatedAt(record.updatedAt),
  );
}

function parseActivityStatusStoreV1(record: ActivityStatusRawRecord): ActivityStatusStore | null {
  if (record.version !== 1 || typeof record.status !== 'string') {
    return null;
  }
  const status = migrateLegacyStatus(record.status);
  return buildActivityStatusStore(
    status,
    { kind: 'until_modified' },
    null,
    parseActivityStatusUpdatedAt(record.updatedAt),
  );
}

export function parseActivityStatusStore(raw: unknown): ActivityStatusStore {
  if (!raw || typeof raw !== 'object') {
    return emptyActivityStatusStore();
  }
  const record = raw as ActivityStatusRawRecord;
  return (
    parseActivityStatusStoreV2(record) ??
    parseActivityStatusStoreV1(record) ??
    emptyActivityStatusStore()
  );
}

/** If until_date is past, resolve back to Actif. Pass `today` from the client. */
export function resolveActivityStatusStore(
  store: ActivityStatusStore,
  today?: string,
): ActivityStatusStore {
  if (store.status === 'active' || !today) {
    return store;
  }
  if (store.retention.kind === 'until_date' && store.retention.untilDate < today) {
    return {
      ...emptyActivityStatusStore(),
      updatedAt: new Date().toISOString(),
    };
  }
  return store;
}

type ActivityStatusStorageSources = {
  rawV2: string | null;
  rawV1: string | null;
  payload: unknown;
};

function readActivityStatusStorageSources(): ActivityStatusStorageSources {
  const rawV2 = window.localStorage.getItem(ACTIVITY_STATUS_STORAGE_KEY);
  const rawV1 = window.localStorage.getItem(ACTIVITY_STATUS_STORAGE_KEY_V1);
  if (rawV2) {
    return { rawV2, rawV1, payload: JSON.parse(rawV2) as unknown };
  }
  if (rawV1) {
    return { rawV2, rawV1, payload: JSON.parse(rawV1) as unknown };
  }
  return { rawV2, rawV1, payload: null };
}

function shouldPersistResolvedActivityStatus(
  resolved: ActivityStatusStore,
  parsed: ActivityStatusStore,
  hadV1Only: boolean,
): boolean {
  return resolved.status !== parsed.status || resolved.version !== parsed.version || hadV1Only;
}

export function readActivityStatusStore(): ActivityStatusStore {
  if (typeof window === 'undefined') {
    return emptyActivityStatusStore();
  }
  try {
    const { rawV2, rawV1, payload } = readActivityStatusStorageSources();
    const parsed = parseActivityStatusStore(payload);
    const resolved = resolveActivityStatusStore(parsed, todayIsoDate());
    if (shouldPersistResolvedActivityStatus(resolved, parsed, Boolean(rawV1 && !rawV2))) {
      writeActivityStatusStore(resolved);
    }
    return resolved;
  } catch {
    return emptyActivityStatusStore();
  }
}

export function writeActivityStatusStore(store: ActivityStatusStore): void {
  if (typeof window === 'undefined') {
    return;
  }
  window.localStorage.setItem(ACTIVITY_STATUS_STORAGE_KEY, JSON.stringify(store));
  window.localStorage.removeItem(ACTIVITY_STATUS_STORAGE_KEY_V1);
  listeners.forEach((listener) => listener());
}

export function setActivityStatus(
  input: ActivityStatusWriteInput | ActivityStatusId,
): ActivityStatusStore {
  const payload: ActivityStatusWriteInput = typeof input === 'string' ? { status: input } : input;
  const { status } = payload;
  const retention =
    status === 'active'
      ? ({ kind: 'until_modified' } as const)
      : (payload.retention ?? defaultRetentionForStatus(status));
  const travelId = status === 'paused' ? (payload.travelId ?? null) : null;
  const next: ActivityStatusStore = {
    version: 2,
    status,
    retention,
    travelId,
    updatedAt: new Date().toISOString(),
  };
  writeActivityStatusStore(next);
  return next;
}

export function subscribeActivityStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getActivityStatusSnapshot(): ActivityStatusId {
  return readActivityStatusStore().status;
}

export function getActivityStatusServerSnapshot(): ActivityStatusId {
  return ACTIVITY_STATUS_DEFAULT;
}

export function getActivityStatusStoreSnapshot(): string {
  return JSON.stringify(readActivityStatusStore());
}

export function getActivityStatusStoreServerSnapshot(): string {
  return JSON.stringify(emptyActivityStatusStore());
}
