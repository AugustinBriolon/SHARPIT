import type { PmcPoint } from "@/lib/analytics";

export type RecoveryTone = "good" | "moderate" | "low" | "neutral";

export interface ReadinessFactor {
  key: string;
  percent: number | null;
  feedback: string | null;
}

export interface ReadinessView {
  score: number | null;
  level: string | null;
  levelLabel: string;
  tone: RecoveryTone;
  recommendation: string;
  accent: string;
}

const FACTOR_LABELS: Record<string, string> = {
  sleep: "Sommeil",
  hrv: "HRV",
  recoveryTime: "Temps de récup",
  acwr: "Charge aiguë",
  stressHistory: "Stress récent",
  sleepHistory: "Sommeil récent",
};

const TONE_ACCENT: Record<RecoveryTone, string> = {
  good: "#059669",
  moderate: "#d97706",
  low: "#dc2626",
  neutral: "#64748b",
};

export function factorLabel(key: string): string {
  return FACTOR_LABELS[key] ?? key;
}

export function accentForTone(tone: RecoveryTone): string {
  return TONE_ACCENT[tone];
}

/** Classe un code feedback Garmin (GOOD / VERY_GOOD / MODERATE / LOW...). */
export function feedbackTone(feedback: string | null): RecoveryTone {
  if (!feedback) return "neutral";
  const f = feedback.toUpperCase();
  if (f.includes("VERY_GOOD") || f.includes("GOOD") || f.includes("EXCELLENT"))
    return "good";
  if (f.includes("MODERATE") || f.includes("FAIR") || f.includes("MEDIUM"))
    return "moderate";
  if (f.includes("LOW") || f.includes("POOR") || f.includes("BAD")) return "low";
  return "neutral";
}

const FEEDBACK_LABELS: Record<string, string> = {
  VERY_GOOD: "Très bon",
  GOOD: "Bon",
  MODERATE: "Moyen",
  FAIR: "Correct",
  LOW: "Faible",
  POOR: "Faible",
};

export function feedbackLabel(feedback: string | null): string {
  if (!feedback) return "—";
  const f = feedback.toUpperCase();
  for (const key of Object.keys(FEEDBACK_LABELS)) {
    if (f.includes(key)) return FEEDBACK_LABELS[key];
  }
  return "—";
}

function scoreTone(score: number | null): RecoveryTone {
  if (score == null) return "neutral";
  if (score >= 75) return "good";
  if (score >= 50) return "moderate";
  return "low";
}

const LEVEL_LABELS: Record<string, string> = {
  VERY_HIGH: "Excellente",
  HIGH: "Bonne",
  MODERATE: "Modérée",
  LOW: "Faible",
  VERY_LOW: "Très faible",
  NONE: "—",
};

export function levelLabel(level: string | null): string {
  if (!level) return "—";
  return LEVEL_LABELS[level.toUpperCase()] ?? level;
}

function buildRecommendation(
  score: number | null,
  tone: RecoveryTone,
): string {
  if (score == null) {
    return "Pas de données de readiness pour aujourd'hui. Fie-toi à ton ressenti et à ta charge.";
  }
  if (tone === "good") {
    return "Bien récupéré : tu peux encaisser une séance intense ou un gros volume aujourd'hui.";
  }
  if (tone === "moderate") {
    return "Récupération partielle : privilégie une séance Z2 ou technique, garde l'intensité max pour plus tard.";
  }
  return "Fatigue marquée : repos actif ou journée off recommandée. Ne force pas l'intensité.";
}

export function buildReadinessView(
  score: number | null,
  level: string | null,
): ReadinessView {
  const tone = scoreTone(score);
  return {
    score,
    level,
    levelLabel: levelLabel(level),
    tone,
    recommendation: buildRecommendation(score, tone),
    accent: accentForTone(tone),
  };
}

// ---- Statut HRV ----

export interface HrvStatusView {
  status: string | null;
  label: string;
  tone: RecoveryTone;
}

const HRV_STATUS_LABELS: Record<string, { label: string; tone: RecoveryTone }> = {
  BALANCED: { label: "Équilibré", tone: "good" },
  UNBALANCED: { label: "Déséquilibré", tone: "moderate" },
  UNBALANCED_LOW: { label: "Bas", tone: "low" },
  UNBALANCED_HIGH: { label: "Élevé", tone: "moderate" },
  LOW: { label: "Bas", tone: "low" },
  POOR: { label: "Faible", tone: "low" },
};

export function buildHrvStatusView(status: string | null): HrvStatusView {
  if (!status) return { status: null, label: "—", tone: "neutral" };
  const entry = HRV_STATUS_LABELS[status.toUpperCase()];
  return {
    status,
    label: entry?.label ?? status,
    tone: entry?.tone ?? "neutral",
  };
}

// ---- Forme (TSB) ----

export interface FormView {
  tsb: number | null;
  label: string;
  tone: RecoveryTone;
  description: string;
}

export function buildFormView(pmc: PmcPoint[]): FormView {
  const tsb = pmc.length ? pmc[pmc.length - 1].tsb : null;
  if (tsb == null) {
    return { tsb: null, label: "—", tone: "neutral", description: "" };
  }
  if (tsb > 15) {
    return {
      tsb,
      label: "Frais",
      tone: "good",
      description: "Tu es affûté, peu de fatigue résiduelle.",
    };
  }
  if (tsb >= -10) {
    return {
      tsb,
      label: "Optimal",
      tone: "good",
      description: "Zone idéale pour progresser.",
    };
  }
  if (tsb >= -30) {
    return {
      tsb,
      label: "Fatigue",
      tone: "moderate",
      description: "Charge élevée, surveille la récupération.",
    };
  }
  return {
    tsb,
    label: "Surcharge",
    tone: "low",
    description: "Fatigue importante, risque de surentraînement.",
  };
}

// ---- Body Battery ----

export function bodyBatteryTone(value: number | null): RecoveryTone {
  if (value == null) return "neutral";
  if (value >= 70) return "good";
  if (value >= 40) return "moderate";
  return "low";
}

// ---- Stress ----

export function stressTone(value: number | null): RecoveryTone {
  if (value == null) return "neutral";
  if (value <= 25) return "good";
  if (value <= 50) return "moderate";
  return "low";
}
