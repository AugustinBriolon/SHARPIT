import { BodySide, PhysicalCategory, PhysicalStatus } from "@prisma/client";

export const categoryLabels: Record<PhysicalCategory, string> = {
  PAIN: "Douleur",
  INJURY: "Blessure",
  MOBILITY: "Mobilité",
  POSTURE: "Posture",
  OTHER: "Autre",
};

export const categoryOrder: PhysicalCategory[] = [
  "PAIN",
  "INJURY",
  "MOBILITY",
  "POSTURE",
  "OTHER",
];

export const statusLabels: Record<PhysicalStatus, string> = {
  ACTIVE: "Active",
  MONITORING: "Sous surveillance",
  RESOLVED: "Résolue",
};

export const statusOrder: PhysicalStatus[] = [
  "ACTIVE",
  "MONITORING",
  "RESOLVED",
];

export const statusColors: Record<PhysicalStatus, string> = {
  ACTIVE: "text-red-400",
  MONITORING: "text-amber-400",
  RESOLVED: "text-emerald-400",
};

export const sideLabels: Record<BodySide, string> = {
  LEFT: "Gauche",
  RIGHT: "Droit",
  BILATERAL: "Bilatéral",
  NA: "—",
};

export const sideOrder: BodySide[] = ["NA", "LEFT", "RIGHT", "BILATERAL"];

/** Suggestions rapides de zones du corps. */
export const COMMON_BODY_PARTS = [
  "Genou",
  "Cheville",
  "Pied",
  "Mollet",
  "Cuisse",
  "Ischio",
  "Hanche",
  "Bassin",
  "Dos",
  "Lombaires",
  "Épaule",
  "Cou",
  "Tendon d'Achille",
];

/** Couleur de sévérité 0-10. */
export function severityColor(severity?: number | null): string {
  if (severity == null) return "text-muted-foreground";
  if (severity >= 7) return "text-red-400";
  if (severity >= 4) return "text-amber-400";
  return "text-emerald-400";
}

export function severityAccent(severity?: number | null): string {
  if (severity == null) return "#94a3b8";
  if (severity >= 7) return "#f87171";
  if (severity >= 4) return "#fbbf24";
  return "#34d399";
}
