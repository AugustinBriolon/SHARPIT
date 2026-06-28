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
  RECOVERY: "text-slate-400",
  ENDURANCE: "text-cyan-400",
  TEMPO: "text-emerald-400",
  THRESHOLD: "text-amber-400",
  VO2MAX: "text-red-400",
  RACE: "text-violet-400",
};

/** Couleur de référence (CSS) par intensité, pour les accents/points. */
export const intensityAccent: Record<SessionIntensity, string> = {
  RECOVERY: "#94a3b8",
  ENDURANCE: "#22d3ee",
  TEMPO: "#34d399",
  THRESHOLD: "#fbbf24",
  VO2MAX: "#f87171",
  RACE: "#a78bfa",
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
