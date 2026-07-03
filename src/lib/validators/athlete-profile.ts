import { z } from 'zod';
import { parseBirthDateInput } from '@/lib/athlete-profile-utils';

const nullableInt = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? null : Number(v)),
  z.union([z.null(), z.number().int().positive()]),
);

const nullablePace = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? null : Number(v)),
  z.union([z.null(), z.number().positive()]),
);

const nullableBedtimeMin = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? null : Number(v)),
  z.union([z.null(), z.number().int().min(0).max(1439)]),
);

const nullableSleepMinutes = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? null : Number(v)),
  z.union([z.null(), z.number().int().min(240).max(720)]),
);

const nullableHeightCm = z.preprocess(
  (v) => (v === '' || v === undefined || v === null ? null : Number(v)),
  z.union([z.null(), z.number().int().min(100).max(250)]),
);

const nullableBirthDate = z.preprocess(
  (v) => {
    if (v === '' || v === undefined || v === null) return null;
    if (typeof v === 'string') return parseBirthDateInput(v);
    if (v instanceof Date) return v;
    return v;
  },
  z.union([
    z.null(),
    z
      .date()
      .refine((d) => d <= new Date() && d.getUTCFullYear() >= 1920, 'Date de naissance invalide'),
  ]),
);

export const athleteProfileSchema = z.object({
  heightCm: nullableHeightCm,
  birthDate: nullableBirthDate,
  ftpW: nullableInt,
  maxHr: nullableInt,
  lthr: nullableInt,
  runThresholdPaceSecPerKm: nullablePace,
  sleepTargetMinutes: nullableSleepMinutes,
  sleepBedtimeTargetMin: nullableBedtimeMin,
});

export type AthleteProfileInput = z.infer<typeof athleteProfileSchema>;
