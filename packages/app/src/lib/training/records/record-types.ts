/** The records' shapes, as the web and the API read them (computed in `@sharpit/server`). */

export interface RecordEntry {
  rank: number;
  value: number;
  displayValue: string;
  sublabel: string | null;
  activityId: string | null;
  date: string; // ISO
  title: string | null;
}

export interface RecordCategory {
  key: string;
  label: string;
  entries: RecordEntry[]; // triées, meilleur en premier (max 5)
}

export interface PowerCurvePoint {
  seconds: number;
  label: string;
  watts: number;
  activityId: string | null;
  date: string;
  title: string | null;
}

export interface RunBestCategory {
  meters: number;
  label: string;
  entries: RecordEntry[]; // top 5, value = secondes
}

/**
 * Effort issu des métriques d'activité (pas des streams) : distance réelle +
 * temps. Couvre TOUTES les activités, pas seulement celles avec trace GPS.
 * Sert de référence robuste aux prédictions quand les streams manquent.
 */
export interface RunEffort {
  meters: number;
  seconds: number;
  /** ISO date of the source activity — required for threshold recency (ADR-012). */
  date?: string;
  activityId?: string | null;
}

export interface BikeEffort {
  seconds: number; // durée du ride
  watts: number; // NP si dispo, sinon puissance moyenne
  /** ISO date of the source activity — required for threshold recency (ADR-012). */
  date?: string;
  activityId?: string | null;
}

export interface RecordsPayload {
  prs: {
    run: RecordCategory[];
    bike: RecordCategory[];
    swim: RecordCategory[];
  };
  powerCurve: PowerCurvePoint[];
  runBests: RunBestCategory[];
  /** Efforts course (distance + temps) depuis les métriques — référence robuste. */
  runEfforts: RunEffort[];
  /** Efforts vélo (durée + puissance) depuis les métriques — référence robuste. */
  bikeEfforts: BikeEffort[];
  streamsAnalyzed: number;
  totalActivities: number;
  generatedAt: string | null;
}

/** Record dont le #1 a changé lors d'un recalcul (nouveau PR ou meilleur effort). */
export interface RecordChange {
  category: string;
  label: string;
  displayValue: string;
  activityId: string | null;
  activityTitle: string | null;
  previousDisplayValue: string | null;
}
