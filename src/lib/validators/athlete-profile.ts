import { z } from 'zod';

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

export const athleteProfileSchema = z.object({
  ftpW: nullableInt,
  maxHr: nullableInt,
  lthr: nullableInt,
  runThresholdPaceSecPerKm: nullablePace,
  sleepTargetMinutes: nullableSleepMinutes,
  sleepBedtimeTargetMin: nullableBedtimeMin,
});

export type AthleteProfileInput = z.infer<typeof athleteProfileSchema>;
