import { SessionIntensity } from "@prisma/client";

export const intensityOrder: SessionIntensity[] = [
  "RECOVERY",
  "ENDURANCE",
  "TEMPO",
  "THRESHOLD",
  "VO2MAX",
  "RACE",
];

export const intensityLabels: Record<SessionIntensity, string> = {
  RECOVERY: "Récupération",
  ENDURANCE: "Endurance",
  TEMPO: "Tempo",
  THRESHOLD: "Seuil",
  VO2MAX: "VO2max",
  RACE: "Compétition",
};

/** Classes Tailwind (texte) par intensité. */
export const intensityTextColors: Record<SessionIntensity, string> = {
  RECOVERY: "text-slate-600",
  ENDURANCE: "text-cyan-600",
  TEMPO: "text-emerald-600",
  THRESHOLD: "text-amber-600",
  VO2MAX: "text-red-600",
  RACE: "text-violet-600",
};

/** Couleur de référence (CSS) par intensité, pour les accents/points. */
export const intensityAccent: Record<SessionIntensity, string> = {
  RECOVERY: "#64748b",
  ENDURANCE: "#0891b2",
  TEMPO: "#059669",
  THRESHOLD: "#d97706",
  VO2MAX: "#dc2626",
  RACE: "#7c3aed",
};

export function intensityLabel(intensity: SessionIntensity | null): string {
  return intensity ? intensityLabels[intensity] : "—";
}

export function formatPlannedDuration(min?: number | null): string {
  if (min == null) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h > 0) return `${h}h${m.toString().padStart(2, "0")}`;
  return `${m} min`;
}
