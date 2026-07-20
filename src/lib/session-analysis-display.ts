import { sessionAnalysisSchema, type SessionAnalysis } from '@/lib/validators/coach';

export const SESSION_VERDICT_LABELS: Record<SessionAnalysis['verdict'], string> = {
  AS_PLANNED: 'Conforme',
  HARDER: 'Plus dur que prévu',
  EASIER: 'Plus facile que prévu',
  SHORTER: 'Plus court',
  LONGER: 'Plus long',
  DIFFERENT: 'Différent',
};

export function parseSessionAnalysis(value: unknown): SessionAnalysis | null {
  const parsed = sessionAnalysisSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

export function sessionScoreColor(score: number): string {
  if (score >= 85) return 'text-primary';
  if (score >= 60) return 'text-signal-caution';
  return 'text-signal-risk';
}

export function plannedSessionHref(plannedSessionId: string): string {
  return `/training/planning?planned=${encodeURIComponent(plannedSessionId)}`;
}
