import { sessionAnalysisSchema, type SessionAnalysis } from '@/lib/validators/coach';
import { sanitizeCoachCopy } from '@/lib/coach/sanitize-coach-copy';

export const SESSION_VERDICT_LABELS: Record<SessionAnalysis['verdict'], string> = {
  AS_PLANNED: 'Conforme',
  HARDER: 'Plus dur que prévu',
  EASIER: 'Plus facile que prévu',
  SHORTER: 'Plus court',
  LONGER: 'Plus long',
  DIFFERENT: 'Différent',
};

function sanitizeSessionAnalysis(analysis: SessionAnalysis): SessionAnalysis {
  return {
    ...analysis,
    summary: sanitizeCoachCopy(analysis.summary),
    remarks: analysis.remarks.map(sanitizeCoachCopy),
    recommendation: sanitizeCoachCopy(analysis.recommendation),
    physicalReassessments: analysis.physicalReassessments?.map((item) => ({
      ...item,
      question: sanitizeCoachCopy(item.question),
      comment: sanitizeCoachCopy(item.comment),
    })),
  };
}

export function parseSessionAnalysis(value: unknown): SessionAnalysis | null {
  const parsed = sessionAnalysisSchema.safeParse(value);
  return parsed.success ? sanitizeSessionAnalysis(parsed.data) : null;
}

export function sessionScoreColor(score: number): string {
  if (score >= 85) {
    return 'text-primary';
  }
  if (score >= 60) {
    return 'text-signal-caution';
  }
  return 'text-signal-risk';
}

export function plannedSessionHref(plannedSessionId: string): string {
  return `/plan/semaine?planned=${encodeURIComponent(plannedSessionId)}`;
}
