'use client';

import type { ActivityType } from '@prisma/client';
import {
  CalendarPlus,
  CalendarX2,
  Check,
  HeartPulse,
  Layers,
  ListChecks,
  MapPin,
  PencilLine,
  Search,
} from 'lucide-react';
import { isStaleCalendarToolPart } from '@/lib/coach/chat/coach-tool-parts';
import {
  ToolActivityAcceptedChip,
  ToolActivityApprovalRequest,
  ToolActivityRejectedChip,
  ToolActivityResultChip,
  ToolActivityStaleChip,
} from '@/components/coach/chat/tool-activity-views';

export type KnownSession = {
  id: string;
  title?: string | null;
  date?: string | null;
  type?: ActivityType | null;
};

type ToolPart = {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
  approval?: { id: string; isAutomatic?: boolean; approved?: boolean; reason?: string };
};

type Meta = {
  label: string;
  icon: typeof Check;
  running: string;
  proposal: string;
};

const META: Record<string, Meta> = {
  'tool-listPlannedSessions': {
    label: 'Calendrier consulté',
    icon: ListChecks,
    running: 'Consultation des séances…',
    proposal: '',
  },
  'tool-getScenarioProjection': {
    label: 'Scénarios projetés',
    icon: Layers,
    running: 'Projection des scénarios…',
    proposal: '',
  },
  'tool-searchWatchExercises': {
    label: 'Catalogue montre consulté',
    icon: Search,
    running: 'Recherche dans le catalogue Garmin…',
    proposal: '',
  },
  'tool-createPlannedSession': {
    label: 'Séance ajoutée',
    icon: CalendarPlus,
    running: 'Ajout de la séance…',
    proposal: 'Ajouter une séance',
  },
  'tool-createBrickSession': {
    label: 'Brick ajouté',
    icon: Layers,
    running: 'Ajout du brick…',
    proposal: 'Ajouter un brick (multisport)',
  },
  'tool-updatePlannedSession': {
    label: 'Séance modifiée',
    icon: PencilLine,
    running: 'Modification de la séance…',
    proposal: 'Modifier une séance',
  },
  'tool-deletePlannedSession': {
    label: 'Séance supprimée',
    icon: CalendarX2,
    running: 'Suppression de la séance…',
    proposal: 'Supprimer une séance',
  },
  'tool-setTravelContext': {
    label: 'Contexte voyage enregistré',
    icon: MapPin,
    running: 'Enregistrement du contexte voyage…',
    proposal: 'Enregistrer un contexte voyage',
  },
  'tool-setTrainingConstraint': {
    label: 'Contrainte enregistrée',
    icon: HeartPulse,
    running: 'Enregistrement de la contrainte…',
    proposal: 'Enregistrer une contrainte',
  },
};

function isManualApprovalRequest(part: ToolPart) {
  return (
    part.state === 'approval-requested' && Boolean(part.approval) && !part.approval?.isAutomatic
  );
}

function renderApprovalToolActivity(options: {
  part: ToolPart;
  meta: Meta;
  knownSessions: Record<string, KnownSession>;
  onApproval?: (id: string, approved: boolean) => void;
  disabled?: boolean;
  streamIdle: boolean;
}) {
  const { part, meta, knownSessions, onApproval, disabled, streamIdle } = options;

  if (isManualApprovalRequest(part)) {
    return (
      <ToolActivityApprovalRequest
        disabled={disabled}
        knownSessions={knownSessions}
        meta={meta}
        part={part}
        onApproval={onApproval}
      />
    );
  }
  if (part.state === 'approval-responded' && part.approval?.approved === false) {
    return <ToolActivityRejectedChip proposal={meta.proposal} />;
  }
  if (part.state === 'approval-responded') {
    return <ToolActivityAcceptedChip meta={meta} streamIdle={streamIdle} />;
  }
  if (part.state === 'output-denied') {
    return <ToolActivityRejectedChip proposal={meta.proposal} />;
  }
  return null;
}

function renderToolActivityBody(options: {
  part: ToolPart;
  meta: Meta;
  knownSessions: Record<string, KnownSession>;
  onApproval?: (id: string, approved: boolean) => void;
  disabled?: boolean;
  streamIdle: boolean;
}) {
  const approvalView = renderApprovalToolActivity(options);
  if (approvalView) {
    return approvalView;
  }
  const { part, meta, streamIdle } = options;
  if (isStaleCalendarToolPart(part, streamIdle)) {
    return <ToolActivityStaleChip part={part} />;
  }
  return <ToolActivityResultChip meta={meta} part={part} streamIdle={streamIdle} />;
}

export function ToolActivity({
  part,
  knownSessions = {},
  onApproval,
  disabled,
  streamIdle = true,
}: {
  part: ToolPart;
  knownSessions?: Record<string, KnownSession>;
  onApproval?: (id: string, approved: boolean) => void;
  disabled?: boolean;
  streamIdle?: boolean;
}) {
  if (!part?.type) {
    return null;
  }
  const meta = META[part.type];
  if (!meta) {
    return null;
  }

  return renderToolActivityBody({
    part,
    meta,
    knownSessions,
    onApproval,
    disabled,
    streamIdle,
  });
}
