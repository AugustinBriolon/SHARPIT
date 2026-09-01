import { z } from 'zod';
import { parseBirthDateInput } from '@/lib/profile/athlete-profile-utils';
import { EQUIPMENT_ITEM_IDS, STRENGTH_VENUES } from '@/lib/equipment/catalog';
import { DISPLAY_MODES } from '@/lib/preferences/display-mode';
import { PRACTICED_SPORTS } from '@/lib/practiced-sports';

/**
 * Absent is not the same as cleared.
 *
 * `z.preprocess` runs for missing keys too — Zod hands the preprocessor
 * `undefined`. Mapping that to `null` materialised every field the caller never
 * sent, and `.partial()` could no longer drop it: a `PATCH {"ftpW":215}` parsed
 * to ftpW plus nine explicit nulls, and the upsert wrote all ten. That is how a
 * profile lost its thresholds on a one-field save.
 *
 * `undefined` therefore stays `undefined` and the key disappears; only an
 * explicit `null` or an empty string means "clear this one".
 */
function patchField<T extends z.ZodTypeAny>(coerce: (value: unknown) => unknown, schema: T) {
  return z.preprocess((value) => {
    if (value === undefined) {
      return undefined;
    }
    if (value === '' || value === undefined || value === null) {
      return null;
    }
    return coerce(value);
  }, schema);
}

const toNumber = (value: unknown) => Number(value);

const nullableInt = patchField(toNumber, z.union([z.null(), z.number().int().positive()]));

/** Garmin accepts pool lengths from 10 m to 100 m. */
const nullablePoolLengthM = patchField(
  toNumber,
  z.union([z.null(), z.number().int().min(10).max(100)]),
);

const nullablePace = patchField(toNumber, z.union([z.null(), z.number().positive()]));

const nullableBedtimeMin = patchField(
  toNumber,
  z.union([z.null(), z.number().int().min(0).max(1439)]),
);

const nullableSleepMinutes = patchField(
  toNumber,
  z.union([z.null(), z.number().int().min(240).max(720)]),
);

const nullableHeightCm = patchField(
  toNumber,
  z.union([z.null(), z.number().int().min(100).max(250)]),
);

const nullableBirthDate = patchField(
  (v) => {
    if (typeof v === 'string') {
      return parseBirthDateInput(v);
    }
    if (v instanceof Date) {
      return v;
    }
    return v;
  },
  z.union([
    z.null(),
    z
      .date()
      .refine((d) => d <= new Date() && d.getUTCFullYear() >= 1920, 'Date de naissance invalide'),
  ]),
);

export const athleteEquipmentSchema = z.object({
  version: z.literal(1),
  strengthVenue: z.enum(STRENGTH_VENUES).nullable(),
  owned: z.array(z.enum(EQUIPMENT_ITEM_IDS)),
});

export const athletePracticedSportsSchema = z.object({
  version: z.literal(1),
  sports: z.array(z.enum(PRACTICED_SPORTS)),
});

/** Partial patch — personal profile, calibration and equipment save independently. */
export const athleteProfileSchema = z
  .object({
    heightCm: nullableHeightCm,
    birthDate: nullableBirthDate,
    ftpW: nullableInt,
    maxHr: nullableInt,
    lthr: nullableInt,
    runThresholdPaceSecPerKm: nullablePace,
    swimCssSecPer100m: nullablePace,
    defaultPoolLengthM: nullablePoolLengthM,
    sleepTargetMinutes: nullableSleepMinutes,
    sleepBedtimeTargetMin: nullableBedtimeMin,
    equipment: athleteEquipmentSchema.nullable(),
    practicedSports: athletePracticedSportsSchema.nullable(),
    displayMode: z.enum(DISPLAY_MODES),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'Aucune donnée à mettre à jour',
  });

export type AthleteProfileInput = z.infer<typeof athleteProfileSchema>;
export type AthleteEquipmentInput = z.infer<typeof athleteEquipmentSchema>;
export type AthletePracticedSportsInput = z.infer<typeof athletePracticedSportsSchema>;
