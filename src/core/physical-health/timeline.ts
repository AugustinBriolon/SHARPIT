import type {
  Condition,
  ConditionEpisode,
  ConditionKnowledge,
  ConditionObservation,
  ConditionTimeline,
  ConditionTimelineEvent,
  FunctionalCapacity,
} from './types';

function byDateAsc(a: { at: Date }, b: { at: Date }): number {
  return a.at.getTime() - b.at.getTime();
}

function observationSeverityLabel(obs: ConditionObservation): string {
  if (obs.symptomPresent && obs.severityReported != null) {
    return `${obs.severityReported}/10`;
  }
  if (obs.symptomPresent) return 'symptôme présent';
  return 'aucun symptôme';
}

/**
 * Build a chronological timeline from persisted domain records.
 * Pure, deterministic, explainable.
 */
export function buildConditionTimeline(input: {
  condition: Condition;
  episodes: readonly ConditionEpisode[];
  observations: readonly ConditionObservation[];
  functionalCapacities: readonly FunctionalCapacity[];
  knowledge: readonly ConditionKnowledge[];
}): ConditionTimeline {
  const events: ConditionTimelineEvent[] = [];

  events.push({
    at: input.condition.startedAt,
    kind: 'CONDITION_STARTED',
    label: input.condition.label,
  });

  for (const episode of input.episodes) {
    events.push({
      at: episode.startedAt,
      kind: 'EPISODE_STARTED',
      label: `Épisode ${episode.episodeNumber}`,
      episodeId: episode.id,
    });

    if (episode.resolvedAt) {
      events.push({
        at: episode.resolvedAt,
        kind: 'EPISODE_RESOLVED',
        label: `Épisode ${episode.episodeNumber} clôturé`,
        episodeId: episode.id,
      });
    }
  }

  for (const obs of input.observations) {
    const severityLabel = observationSeverityLabel(obs);

    events.push({
      at: obs.observedAt,
      kind: 'OBSERVATION',
      label: `Observation · ${severityLabel}`,
      observationId: obs.id,
      severityReported: obs.severityReported,
      symptomPresent: obs.symptomPresent,
      functionalImpact: obs.functionalImpact,
      context: obs.context,
    });
  }

  for (const fc of input.functionalCapacities) {
    events.push({
      at: fc.assessedAt,
      kind: 'FUNCTIONAL_CAPACITY',
      label: `Capacité fonctionnelle · ${fc.trainingCapacity}`,
      observationId: fc.observationId ?? undefined,
    });
  }

  for (const k of input.knowledge) {
    events.push({
      at: k.createdAt,
      kind: 'KNOWLEDGE_ADDED',
      label: k.description,
    });
  }

  if (input.condition.resolvedAt) {
    events.push({
      at: input.condition.resolvedAt,
      kind: 'STATUS_CHANGE',
      label: 'Condition marquée résolue',
    });
  }

  events.sort(byDateAsc);

  return {
    conditionId: input.condition.id,
    events,
  };
}
