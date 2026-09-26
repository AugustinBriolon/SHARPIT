import { activityTypeLabels } from '@sharpit/server/lib/format';
import { parseSessionAnalysis } from '@sharpit/server/lib/planned-session/display/session-analysis-display';
import type { PlannedSessionSummary } from '@sharpit/server/lib/activity/detail/types';

export function plannedSessionChipValue(
  planned: PlannedSessionSummary,
  isAnalyzing: boolean,
): string {
  const analysis = parseSessionAnalysis(planned.analysis);
  if (analysis) {
    return `${analysis.complianceScore}/100`;
  }
  if (isAnalyzing) {
    return 'Analyse…';
  }
  return planned.title ?? activityTypeLabels[planned.type];
}

export function plannedSessionChipLabel(
  planned: PlannedSessionSummary,
  isAnalyzing: boolean,
): string {
  const analysis = parseSessionAnalysis(planned.analysis);
  if (analysis || isAnalyzing) {
    return 'Conformité';
  }
  return 'Liée au plan';
}
