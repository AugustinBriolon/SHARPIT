import { ActivityType } from "@prisma/client";

export function formatDuration(seconds?: number | null): string {
  if (!seconds) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m} min`;
}

export function formatPace(secPerKm?: number | null): string {
  if (!secPerKm) return "—";
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}'${s.toString().padStart(2, "0")}/km`;
}

export function formatSwimPace(secPer100m?: number | null): string {
  if (!secPer100m) return "—";
  const m = Math.floor(secPer100m / 60);
  const s = Math.round(secPer100m % 60);
  return `${m}:${s.toString().padStart(2, "0")}/100m`;
}

export function formatDistance(meters?: number | null): string {
  if (!meters) return "—";
  if (meters >= 1000) return `${(meters / 1000).toFixed(2)} km`;
  return `${Math.round(meters)} m`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("fr-FR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(date);
}

export function formatDateTimeLocal(date: Date): string {
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export const activityTypeLabels: Record<ActivityType, string> = {
  RUN: "Course",
  BIKE: "Vélo",
  SWIM: "Natation",
  STRENGTH: "Musculation",
};

export const activityTypeColors: Record<ActivityType, string> = {
  RUN: "text-orange-400",
  BIKE: "text-cyan-400",
  SWIM: "text-blue-400",
  STRENGTH: "text-violet-400",
};
