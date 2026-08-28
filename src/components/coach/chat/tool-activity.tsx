'use client';

import type { ActivityType } from '@prisma/client';
import {
  CalendarPlus,
  CalendarX2,
  Check,
  HeartPulse,
  Layers,
  ListChecks,
  Loader2,
  MapPin,
  PencilLine,
  Search,
  X,
} from 'lucide-react';
import { activityTypeLabels } from '@/lib/format';
import {
  failureHintForPart,
  failureLabelForPart,
  humanizeToolErrorMessage,
} from '@/lib/coach/chat/coach-tool-display';
import { isStaleCalendarToolPart } from '@/lib/coach/chat/coach-tool-parts';
import { intensityLabels } from '@/lib/planned-session/sessions';
import { cn } from '@/lib/utils';

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

type SessionInput = {
  id?: string;
  date?: string;
  type?: ActivityType;
  intensity?: keyof typeof intensityLabels;
  title?: string;
  durationMin?: number;
  load?: number;
  description?: string;
  strengthPrescription?: {
    sets?: Array<{ exercise?: string; sets?: number; reps?: number }>;
  };
  locationLabel?: string;
  locationLat?: number;
  locationLng?: number;
  exposureSetting?: 'INDOOR' | 'OUTDOOR' | 'UNKNOWN';
  startTime?: string | null;
};

const EXPOSURE_LABELS: Record<NonNullable<SessionInput['exposureSetting']>, string> = {
  INDOOR: 'Intérieur',
  OUTDOOR: 'Extérieur',
  UNKNOWN: 'Non précisé',
};

type TravelInput = {
  locationLabel?: string;
  startDate?: string;
  endDate?: string;
  label?: string | null;
  note?: string | null;
  trainingConstraint?: 'FULL' | 'REDUCED' | 'MOBILITY_ONLY' | 'NONE' | null;
  allowedDisciplines?: Array<'RUN' | 'BIKE' | 'SWIM' | 'STRENGTH' | 'MOBILITY'> | null;
  noStructuredTraining?: boolean;
};

/** Résumé lisible de ce que l'IA propose, à partir de l'input de l'outil. */
function describeInput(
  type: string,
  input: SessionInput,
  known: Record<string, KnownSession>,
): { headline: string; lines: string[] } {
  const ref = input.id ? known[input.id] : undefined;
  const lines: string[] = [];

  const fmtType = (t?: ActivityType) => (t ? activityTypeLabels[t] : null);

  if (type === 'tool-setTravelContext' || type === 'tool-setTrainingConstraint') {
    const travel = input as unknown as TravelInput;
    const headline =
      travel.label?.trim() ||
      (type === 'tool-setTravelContext'
        ? `Voyage · ${travel.locationLabel ?? 'Lieu'}`
        : 'Contrainte temporaire');
    if (travel.startDate && travel.endDate) {
      lines.push(`${travel.startDate} → ${travel.endDate}`);
    }
    if (type === 'tool-setTravelContext' && travel.locationLabel) {
      lines.push(travel.locationLabel);
    }
    if (travel.noStructuredTraining) {
      lines.push('Aucun sport structuré');
    } else if (travel.allowedDisciplines && travel.allowedDisciplines.length > 0) {
      const labels: Record<(typeof travel.allowedDisciplines)[number], string> = {
        RUN: 'Course',
        BIKE: 'Vélo',
        SWIM: 'Natation',
        STRENGTH: 'Renfo',
        MOBILITY: 'Mobilité',
      };
      lines.push(travel.allowedDisciplines.map((d) => labels[d]).join(' · '));
    } else if (travel.trainingConstraint && travel.trainingConstraint !== 'FULL') {
      const constraintLabels = {
        REDUCED: 'Entraînement réduit',
        MOBILITY_ONLY: 'Mobilité uniquement',
        NONE: 'Pas d’entraînement structuré',
      } as const;
      lines.push(constraintLabels[travel.trainingConstraint]);
    }
    if (travel.note) {
      lines.push(travel.note);
    }
    return { headline, lines };
  }

  if (type === 'tool-deletePlannedSession') {
    const headline = ref
      ? `${ref.title ?? 'Séance'}${ref.date ? ` — ${ref.date}` : ''}`
      : 'Séance ciblée';
    return { headline, lines: [] };
  }

  if (type === 'tool-createBrickSession') {
    const brick = input as unknown as {
      date?: string;
      title?: string;
      legs?: {
        type?: ActivityType;
        intensity?: keyof typeof intensityLabels;
        title?: string;
        durationMin?: number;
        load?: number;
      }[];
    };
    const headline = brick.title ?? 'Brick (multisport)';
    if (brick.date) {
      lines.push(brick.date);
    }
    for (const leg of brick.legs ?? []) {
      const legMeta = [
        fmtType(leg.type),
        leg.intensity ? intensityLabels[leg.intensity] : null,
        leg.durationMin ? `${leg.durationMin} min` : null,
        leg.load ? `${leg.load} TSS` : null,
      ]
        .filter(Boolean)
        .join(' · ');
      lines.push(`${leg.title ?? fmtType(leg.type) ?? 'Étape'}${legMeta ? ` — ${legMeta}` : ''}`);
    }
    return { headline, lines };
  }

  if (type === 'tool-createPlannedSession') {
    const headline = input.title ?? 'Nouvelle séance';
    const meta = [
      input.date,
      fmtType(input.type),
      input.intensity ? intensityLabels[input.intensity] : null,
      input.durationMin ? `${input.durationMin} min` : null,
      input.load ? `${input.load} TSS` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    if (meta) {
      lines.push(meta);
    }
    if (input.description) {
      lines.push(input.description);
    }
    const exoCount = input.strengthPrescription?.sets?.length ?? 0;
    if (exoCount > 0) {
      lines.push(`${exoCount} exercice${exoCount > 1 ? 's' : ''} prescrits`);
    }
    return { headline, lines };
  }

  // update : on n'affiche que ce qui change
  const sessionTitle = ref?.title ?? (ref?.type ? fmtType(ref.type) : null);
  const headline = sessionTitle
    ? `${sessionTitle}${ref?.date ? ` — ${ref.date}` : ''}`
    : (input.title ?? 'Séance');
  if (input.date) {
    lines.push(`Date → ${input.date}`);
  }
  if (input.type) {
    lines.push(`Type → ${fmtType(input.type)}`);
  }
  if (input.intensity) {
    lines.push(`Intensité → ${intensityLabels[input.intensity]}`);
  }
  if (input.title) {
    lines.push(`Titre → ${input.title}`);
  }
  if (input.durationMin) {
    lines.push(`Durée → ${input.durationMin} min`);
  }
  if (input.load) {
    lines.push(`Charge → ${input.load} TSS`);
  }
  if (input.startTime) {
    lines.push(`Heure → ${input.startTime}`);
  }
  if (input.exposureSetting) {
    lines.push(`Exposition → ${EXPOSURE_LABELS[input.exposureSetting]}`);
  }
  const updateExoCount = input.strengthPrescription?.sets?.length ?? 0;
  if (updateExoCount > 0) {
    lines.push(`Exercices → ${updateExoCount} prescrits`);
  }
  if (input.locationLabel) {
    lines.push(`Lieu → ${input.locationLabel}`);
  }
  if (input.description) {
    lines.push(input.description);
  }
  if (lines.length === 0 && ref) {
    lines.push('Mise à jour sans détail supplémentaire');
  }
  return { headline, lines };
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

  const Icon = meta.icon;
  const { state } = part;
  const isList = part.type === 'tool-listPlannedSessions';

  // 1) Approval card — structured Beautiful UI style
  if (state === 'approval-requested' && part.approval && !part.approval.isAutomatic) {
    const { headline, lines } = describeInput(
      part.type,
      (part.input ?? {}) as SessionInput,
      knownSessions,
    );
    const isDelete = part.type === 'tool-deletePlannedSession';
    return (
      <div className="border-analysis-border bg-background rounded-analysis overflow-hidden border transition-[color,background-color,border-color] duration-200">
        <div className="space-y-2 px-3 pt-3 pb-2">
          <div className="flex items-center gap-2">
            <span className="bg-primary/10 text-primary inline-flex size-6 items-center justify-center rounded-full">
              <Icon className="size-3.5" aria-hidden />
            </span>
            <p className="text-muted-foreground text-xs font-medium">{meta.proposal}</p>
          </div>
          <p className="text-foreground text-sm leading-snug font-medium">{headline}</p>
          {lines.length > 0 && (
            <div className="bg-muted/40 rounded-lg px-2.5 py-2">
              {lines.map((line, i) => (
                <p key={i} className="text-muted-foreground text-xs leading-relaxed">
                  {line}
                </p>
              ))}
            </div>
          )}
        </div>
        <div className="border-border/40 flex border-t">
          <button
            className="text-muted-foreground hover:bg-muted/50 flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors disabled:opacity-50"
            disabled={disabled}
            type="button"
            onClick={() => onApproval?.(part.approval!.id, false)}
          >
            <X className="size-3.5" aria-hidden />
            Refuser
          </button>
          <span className="border-border/40 border-l" />
          <button
            disabled={disabled}
            type="button"
            className={cn(
              'flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors disabled:opacity-50',
              isDelete
                ? 'text-destructive hover:bg-destructive/5'
                : 'text-primary hover:bg-primary/5',
            )}
            onClick={() => onApproval?.(part.approval!.id, true)}
          >
            <Check className="size-3.5" aria-hidden />
            {isDelete ? 'Supprimer' : 'Valider'}
          </button>
        </div>
      </div>
    );
  }

  // 2) Approval responded — rejected
  if (state === 'approval-responded' && part.approval?.approved === false) {
    return (
      <span className="border-analysis-border/60 bg-analysis-surface-alt/60 text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium">
        <X className="size-3 shrink-0" aria-hidden />
        <span className="line-through">{meta.proposal}</span>
      </span>
    );
  }

  // Approval responded — accepted, waiting for execution
  if (state === 'approval-responded') {
    return (
      <span className="border-primary/30 bg-primary/8 text-primary inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium">
        {streamIdle ? (
          <Check className="size-3 shrink-0" aria-hidden />
        ) : (
          <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden />
        )}
        {streamIdle ? meta.label : meta.running}
      </span>
    );
  }

  // 3) Output denied
  if (state === 'output-denied') {
    return (
      <span className="border-analysis-border/60 bg-analysis-surface-alt/60 text-muted-foreground inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium">
        <X className="size-3 shrink-0" aria-hidden />
        <span className="line-through">{meta.proposal}</span>
      </span>
    );
  }

  const done = state === 'output-available';
  const failed = state === 'output-error';
  const stale = isStaleCalendarToolPart(part, streamIdle);

  if (stale) {
    return (
      <span className="border-destructive/30 bg-destructive/5 text-destructive inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium">
        <X className="size-3 shrink-0" aria-hidden />
        {failureLabelForPart(part)}
      </span>
    );
  }

  const output = part.output as
    | {
        ok?: boolean;
        error?: string;
        title?: string | null;
        date?: string;
        locationLabel?: string;
        legs?: { title?: string | null; type?: string }[];
      }
    | undefined;
  const koExec = done && output?.ok === false;
  const isFailure = failed || koExec;

  let tooltip: string | null = null;

  if (isFailure) {
    const { hint, debug } = failed
      ? humanizeToolErrorMessage(part.errorText)
      : failureHintForPart(part);
    tooltip = debug ?? hint;
  } else if (done && !isList && output) {
    if (part.type === 'tool-setTravelContext' && output.locationLabel) {
      tooltip = output.locationLabel;
    } else if (part.type === 'tool-createBrickSession' && output.legs?.length) {
      const legLabels = output.legs
        .map((l) => l.title ?? (l.type ? activityTypeLabels[l.type as ActivityType] : null))
        .filter(Boolean);
      tooltip = [output.date, legLabels.join(' → ')].filter(Boolean).join(' · ') || null;
    } else {
      tooltip = [output.title, output.date].filter(Boolean).join(' · ') || null;
    }
  }

  let chipClass = 'border-analysis-border/60 bg-analysis-surface-alt/60 text-muted-foreground';
  if (isFailure) {
    chipClass = 'border-destructive/30 bg-destructive/5 text-destructive';
  } else if (done) {
    chipClass = 'border-primary/30 bg-primary/8 text-primary';
  }

  let chipLabel = meta.running;
  if (isFailure) {
    chipLabel = failureLabelForPart(part);
  } else if (done) {
    chipLabel = meta.label;
  }

  return (
    <span
      title={tooltip ?? undefined}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium',
        chipClass,
      )}
    >
      {!done && !failed ? <Loader2 className="size-3 shrink-0 animate-spin" aria-hidden /> : null}
      {isFailure ? <X className="size-3 shrink-0" aria-hidden /> : null}
      {done && !isFailure ? <Icon className="size-3 shrink-0" aria-hidden /> : null}
      {chipLabel}
    </span>
  );
}
