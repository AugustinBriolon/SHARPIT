export const DEFAULT_TRAINING_DAY_START_HOUR = 4;
export const DEFAULT_TRAINING_DAY_TIMEZONE = 'Europe/Paris';

export type TrainingDayOptions = {
  timezone?: string;
  trainingDayStartHour?: number;
};

function formatPartsInTimezone(date: Date, timezone: string) {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hour12: false,
  });

  return Object.fromEntries(
    formatter.formatToParts(date).map(({ type, value }) => [type, value]),
  ) as Record<string, string>;
}

export function computeTrainingDayId(timestamp: Date, options: TrainingDayOptions = {}): string {
  const timezone = options.timezone ?? DEFAULT_TRAINING_DAY_TIMEZONE;
  const trainingDayStartHour = options.trainingDayStartHour ?? DEFAULT_TRAINING_DAY_START_HOUR;
  const parts = formatPartsInTimezone(timestamp, timezone);
  const localHour = Number.parseInt(parts.hour, 10);

  if (localHour < trainingDayStartHour) {
    const previousDay = new Date(timestamp.getTime() - 24 * 60 * 60_000);
    const previousParts = formatPartsInTimezone(previousDay, timezone);
    return `${previousParts.year}-${previousParts.month}-${previousParts.day}`;
  }

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function trainingDayIdForNow(
  options: TrainingDayOptions = {},
  now: Date = new Date(),
): string {
  return computeTrainingDayId(now, options);
}

export function addTrainingDays(trainingDayId: string, days: number): string {
  const [year, month, day] = trainingDayId.split('-').map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().split('T')[0];
}

export function activityMatchesTrainingDay(
  activityDate: Date | string,
  trainingDayId: string,
  options: TrainingDayOptions = {},
): boolean {
  return computeTrainingDayId(new Date(activityDate), options) === trainingDayId;
}

export function approximateTrainingDayUtcRange(trainingDayId: string): {
  gte: Date;
  lte: Date;
} {
  const previousDay = addTrainingDays(trainingDayId, -1);
  const nextDay = addTrainingDays(trainingDayId, 1);
  return {
    gte: new Date(`${previousDay}T00:00:00.000Z`),
    lte: new Date(`${nextDay}T23:59:59.999Z`),
  };
}
