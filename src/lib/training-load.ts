import { endOfDay, startOfDay, subDays } from "date-fns";

export function computeTrainingLoad(
  activities: { load: number | null; date: Date }[],
  refDate: Date = new Date(),
) {
  const end = endOfDay(refDate);
  const acuteStart = startOfDay(subDays(refDate, 7));
  const chronicStart = startOfDay(subDays(refDate, 42));

  const inRange = (d: Date, start: Date) => {
    const date = new Date(d);
    return date >= start && date <= end;
  };

  const acuteLoad = activities
    .filter((a) => inRange(a.date, acuteStart))
    .reduce((sum, a) => sum + (a.load ?? 0), 0);
  const chronicLoad =
    activities
      .filter((a) => inRange(a.date, chronicStart))
      .reduce((sum, a) => sum + (a.load ?? 0), 0) / 6 || 0;
  const acwr = chronicLoad > 0 ? acuteLoad / chronicLoad : 0;

  let fatigue: "Low" | "Medium" | "High" = "Low";
  if (acwr >= 1.3) fatigue = "High";
  else if (acwr >= 0.9) fatigue = "Medium";

  return {
    weeklyLoad: Math.round(acuteLoad),
    acwr: Number(acwr.toFixed(2)),
    fatigue,
  };
}
