/**
 * Apple Health arrives from the native app as one summary per day. It fills gaps and never
 * overwrites: Garmin, Withings and Renpho write richer, provider-native values, and the
 * next provider sync overwrites whatever Apple Health filled in (see docs/adr ADR-043).
 */

export type AppleHealthDay = {
  date: string;
  sleepMinutes?: number | null;
  sleepDeepMin?: number | null;
  sleepRemMin?: number | null;
  sleepLightMin?: number | null;
  sleepAwakeMin?: number | null;
  sleepBedtimeMin?: number | null;
  sleepWakeMin?: number | null;
  restingHr?: number | null;
  hrv?: number | null;
  totalSteps?: number | null;
  calories?: number | null;
  weightKg?: number | null;
};

export type StoredHealthDay = Partial<Record<Exclude<keyof AppleHealthDay, 'date'>, number | null>>;

const SLEEP_FIELDS = [
  'sleepMinutes',
  'sleepDeepMin',
  'sleepRemMin',
  'sleepLightMin',
  'sleepAwakeMin',
  'sleepBedtimeMin',
  'sleepWakeMin',
] as const;

const SCALAR_FIELDS = ['restingHr', 'hrv', 'totalSteps', 'calories', 'weightKg'] as const;

function isSet(value: number | null | undefined): value is number {
  return value !== null && value !== undefined;
}

function nightPatch(current: StoredHealthDay, incoming: AppleHealthDay): StoredHealthDay {
  if (isSet(current.sleepMinutes) || !isSet(incoming.sleepMinutes) || incoming.sleepMinutes <= 0) {
    return {};
  }
  const patch: StoredHealthDay = {};
  for (const field of SLEEP_FIELDS) {
    if (isSet(incoming[field])) {
      patch[field] = incoming[field];
    }
  }
  return patch;
}

function scalarPatch(
  current: StoredHealthDay,
  incoming: AppleHealthDay,
  garminConnected: boolean,
): StoredHealthDay {
  const fields = SCALAR_FIELDS.filter((field) => !(field === 'hrv' && garminConnected));
  const patch: StoredHealthDay = {};
  for (const field of fields) {
    if (!isSet(current[field]) && isSet(incoming[field])) {
      patch[field] = incoming[field];
    }
  }
  return patch;
}

/**
 * The fields Apple Health may write for one day, given what the day already holds.
 *
 * - A night is taken whole or not at all: stages from one source beside a total from
 *   another would not add up.
 * - HRV is skipped while Garmin is connected. Apple Health stores SDNN, Garmin reports an
 *   overnight RMSSD; one baseline cannot hold both.
 */
export function appleHealthPatch(
  existing: StoredHealthDay | null,
  incoming: AppleHealthDay,
  options: { garminConnected: boolean },
): StoredHealthDay {
  const current = existing ?? {};
  return {
    ...nightPatch(current, incoming),
    ...scalarPatch(current, incoming, options.garminConnected),
  };
}
