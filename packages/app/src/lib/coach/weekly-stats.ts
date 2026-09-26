/** The weekly review's figures, as the web reads them (built by `@sharpit/server/lib/coach/weekly-review`). */

export interface WeeklyStats {
  weekStart: string;
  weekEnd: string;
  sessionsDone: number;
  sessionsPlanned: number;
  sessionsCompleted: number;
  totalLoad: number;
  totalDurationMin: number;
  prevTotalLoad: number;
  /** 7 points lundi→dimanche, pour illustrer la section "Bilan d'entraînement". */
  dailyLoad: (number | null)[];
  /** 7 points lundi→dimanche, pour illustrer la section "Sommeil & récupération". */
  dailySleepScore: (number | null)[];
  byType: { type: string; count: number; durationMin: number }[];
  avgComplianceScore: number | null;
  sleep: {
    avgDurationMin: number | null;
    avgScore: number | null;
    avgDeepPct: number | null;
    avgRemPct: number | null;
    regularityMin: number | null;
    recommendedBedtimeMin: number | null;
  };
  recovery: {
    avgReadiness: number | null;
    avgHrv: number | null;
    avgRestingHr: number | null;
  };
}
