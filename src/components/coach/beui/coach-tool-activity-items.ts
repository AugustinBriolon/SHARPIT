import type { AgentActivityItem, AgentActivityStatus } from '@/components/agents/agent-activity';
import {
  failureLabelForPart,
  isToolFailure,
  isToolSuccess,
} from '@/lib/coach/chat/coach-tool-display';
import type { ToolPartLite } from '@/lib/coach/chat/coach-tool-parts';

const TOOL_LABELS: Record<string, { running: string; done: string }> = {
  'tool-listPlannedSessions': {
    running: 'Consultation des séances…',
    done: 'Calendrier consulté',
  },
  'tool-getScenarioProjection': {
    running: 'Projection des scénarios…',
    done: 'Scénarios projetés',
  },
  'tool-searchWatchExercises': {
    running: 'Recherche dans le catalogue Garmin…',
    done: 'Catalogue montre consulté',
  },
  'tool-createPlannedSession': {
    running: 'Ajout de la séance…',
    done: 'Séance ajoutée',
  },
  'tool-createBrickSession': {
    running: 'Ajout du brick…',
    done: 'Brick ajouté',
  },
  'tool-updatePlannedSession': {
    running: 'Modification de la séance…',
    done: 'Séance modifiée',
  },
  'tool-deletePlannedSession': {
    running: 'Suppression de la séance…',
    done: 'Séance supprimée',
  },
  'tool-setTravelContext': {
    running: 'Enregistrement du contexte voyage…',
    done: 'Contexte voyage enregistré',
  },
  'tool-setTrainingConstraint': {
    running: 'Enregistrement de la contrainte…',
    done: 'Contrainte enregistrée',
  },
};

function stepStatus(part: ToolPartLite, streamIdle: boolean): 'pending' | 'active' | 'complete' {
  if (isToolSuccess(part) || part.state === 'output-denied') {
    return 'complete';
  }
  if (isToolFailure(part)) {
    return 'complete';
  }
  if (part.state === 'approval-responded' && streamIdle) {
    return 'complete';
  }
  if (part.state === 'approval-responded') {
    return 'active';
  }
  if (!streamIdle && !isToolSuccess(part) && !isToolFailure(part)) {
    return 'active';
  }
  return 'complete';
}

function labelForPart(part: ToolPartLite, streamIdle: boolean): string {
  const meta = TOOL_LABELS[part.type];
  if (!meta) {
    return part.type.replace(/^tool-/, '');
  }
  if (isToolFailure(part)) {
    return failureLabelForPart(part);
  }
  if (isToolSuccess(part)) {
    return meta.done;
  }
  if (part.state === 'output-denied') {
    return meta.done;
  }
  if (!streamIdle) {
    return meta.running;
  }
  return meta.done;
}

export function toolPartsToAgentActivity(
  parts: ToolPartLite[],
  streamIdle: boolean,
): { items: AgentActivityItem[]; status: AgentActivityStatus } {
  const inline = parts.filter((p) => p.state !== 'approval-requested');
  if (inline.length === 0) {
    return { items: [], status: 'complete' };
  }

  const items: AgentActivityItem[] = inline.map((part, index) => ({
    id: `${part.type}-${index}-${part.state ?? 'pending'}`,
    type: 'step' as const,
    label: labelForPart(part, streamIdle),
    status: stepStatus(part, streamIdle),
  }));

  const working = items.some((item) => item.type === 'step' && item.status === 'active');
  return { items, status: working ? 'working' : 'complete' };
}
