/**
 * Learning feedback — presentation mapping. Turns LearningFeedbackItem[] (pure stats,
 * src/lib/decision-memory/learning-feedback.ts) into athlete-facing French sentences.
 * Never a simplistic coach score — states the pattern and the evidence count.
 */

import { activityTypeLabels } from '@/lib/format';
import { intensityLabels } from '@/lib/planned-session/sessions';
import type { LearningFeedbackItem } from '@/lib/decision-memory/learning-feedback';
import type { WeeklyBriefLearningFeedbackItem } from '@/core/presentation/weekly-coaching-brief-view-model';

function categoryLabel(item: LearningFeedbackItem): string {
  if (!item.type) return '';
  const typeLabel = activityTypeLabels[item.type];
  const intensityLabel = item.intensity ? intensityLabels[item.intensity] : null;
  return intensityLabel ? `${typeLabel} ${intensityLabel}` : typeLabel;
}

export function describeLearningFeedbackItem(
  item: LearningFeedbackItem,
): WeeklyBriefLearningFeedbackItem {
  const key = `${item.kind}:${item.type ?? 'none'}:${item.intensity ?? 'none'}`;

  switch (item.kind) {
    case 'REPEATED_HARDER_THAN_PLANNED':
      return {
        key,
        sentence: `Les séances de ${categoryLabel(item)} ont été plus dures que prévu sur les ${item.sampleCount} dernières évaluations.`,
      };
    case 'RECOVERED_WITHIN_EXPECTED_WINDOW':
      return {
        key,
        sentence: `Tu récupères dans la fenêtre attendue après les séances de ${categoryLabel(item)} (${item.sampleCount} évaluations).`,
      };
    case 'INSUFFICIENT_EVIDENCE':
      return {
        key,
        sentence: 'Preuves encore insuffisantes pour dégager une tendance.',
      };
  }
}

export function buildLearningFeedbackViewModel(
  items: LearningFeedbackItem[],
): WeeklyBriefLearningFeedbackItem[] {
  return items.map(describeLearningFeedbackItem);
}
