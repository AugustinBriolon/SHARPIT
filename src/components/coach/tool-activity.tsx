'use client';

import type { ActivityType } from '@prisma/client';
import {
  CalendarPlus,
  CalendarX2,
  Check,
  Layers,
  ListChecks,
  Loader2,
  MapPin,
  PencilLine,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { activityTypeLabels } from '@/lib/format';
import {
  failureHintForPart,
  failureLabelForPart,
  humanizeToolErrorMessage,
  sessionTitleFromPart,
} from '@/lib/coach-tool-display';
import { isStaleCalendarToolPart } from '@/lib/coach-tool-parts';
import { intensityLabels } from '@/lib/sessions';
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

  if (type === 'tool-setTravelContext') {
    const travel = input as unknown as TravelInput;
    const headline = travel.label?.trim() || `Voyage · ${travel.locationLabel ?? 'Lieu'}`;
    if (travel.startDate && travel.endDate) {
      lines.push(`${travel.startDate} → ${travel.endDate}`);
    }
    if (travel.locationLabel) lines.push(travel.locationLabel);
    if (travel.note) lines.push(travel.note);
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
    if (brick.date) lines.push(brick.date);
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
    if (meta) lines.push(meta);
    if (input.description) lines.push(input.description);
    return { headline, lines };
  }

  // update : on n'affiche que ce qui change
  const sessionTitle = ref?.title ?? (ref?.type ? fmtType(ref.type) : null);
  const headline = sessionTitle
    ? `${sessionTitle}${ref?.date ? ` — ${ref.date}` : ''}`
    : (input.title ?? 'Séance');
  if (input.date) lines.push(`Date → ${input.date}`);
  if (input.type) lines.push(`Type → ${fmtType(input.type)}`);
  if (input.intensity) lines.push(`Intensité → ${intensityLabels[input.intensity]}`);
  if (input.title) lines.push(`Titre → ${input.title}`);
  if (input.durationMin) lines.push(`Durée → ${input.durationMin} min`);
  if (input.load) lines.push(`Charge → ${input.load} TSS`);
  if (input.startTime) lines.push(`Heure → ${input.startTime}`);
  if (input.exposureSetting) {
    lines.push(`Exposition → ${EXPOSURE_LABELS[input.exposureSetting]}`);
  }
  if (input.locationLabel) lines.push(`Lieu → ${input.locationLabel}`);
  if (input.description) lines.push(input.description);
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
  const meta = META[part.type];
  if (!meta) return null;

  const Icon = meta.icon;
  const { state } = part;
  const isList = part.type === 'tool-listPlannedSessions';

  // 1) Demande de validation : on affiche la proposition + boutons
  if (state === 'approval-requested' && part.approval && !part.approval.isAutomatic) {
    const { headline, lines } = describeInput(
      part.type,
      (part.input ?? {}) as SessionInput,
      knownSessions,
    );
    const isDelete = part.type === 'tool-deletePlannedSession';
    return (
      <div className="border-primary/30 bg-primary/5 rounded-lg border p-3">
        <div className="text-foreground flex items-center gap-2 text-xs font-medium">
          <Icon className="text-primary size-3.5 shrink-0" />
          {meta.proposal}
        </div>
        <p className="text-foreground mt-1.5 text-sm font-medium">{headline}</p>
        {lines.length > 0 && (
          <ul className="text-muted-foreground mt-1 space-y-0.5 text-xs">
            {lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <Button
            disabled={disabled}
            size="sm"
            variant={isDelete ? 'destructive' : 'default'}
            onClick={() => onApproval?.(part.approval!.id, true)}
          >
            <Check className="size-3.5" />
            {isDelete ? 'Supprimer' : 'Valider'}
          </Button>
          <Button
            disabled={disabled}
            size="sm"
            variant="outline"
            onClick={() => onApproval?.(part.approval!.id, false)}
          >
            <X className="size-3.5" />
            Refuser
          </Button>
        </div>
      </div>
    );
  }

  // 2) Refusé
  if (state === 'output-denied') {
    const reason = part.approval?.reason;
    return (
      <div className="border-border/60 bg-card/40 text-muted-foreground flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs">
        <X className="size-3.5 shrink-0" />
        <span className="line-through">{meta.proposal}</span>
        <span className="opacity-70">— {reason?.trim() ? reason : 'proposition refusée'}</span>
      </div>
    );
  }

  const done = state === 'output-available';
  const failed = state === 'output-error';
  const stale = isStaleCalendarToolPart(part, streamIdle);

  if (stale) {
    const staleMessage =
      state === 'approval-responded'
        ? "L'exécution a été interrompue"
        : 'Proposition non finalisée — envoie un nouveau message pour continuer';
    return (
      <div
        className="border-destructive/30 bg-destructive/5 text-destructive flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs"
        title={state === 'approval-responded' ? "La séance n'a pas pu être ajoutée" : undefined}
      >
        <X className="size-3.5 shrink-0" />
        <span className="font-medium">{failureLabelForPart(part)}</span>
        <span className="opacity-90">— {staleMessage}</span>
      </div>
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

  let detail: string | null = null;
  let debugDetail: string | null = null;

  if (isFailure) {
    const { hint, debug } = failed
      ? humanizeToolErrorMessage(part.errorText)
      : failureHintForPart(part);
    debugDetail = debug;
    const hasTitle = Boolean(sessionTitleFromPart(part));
    const isGenericHint =
      hint === "L'ajout n'a pas abouti" || hint === "L'opération n'a pas abouti";
    detail = hint && !(hasTitle && isGenericHint) ? hint : null;
  } else if (done && !isList && output) {
    if (part.type === 'tool-setTravelContext' && output.locationLabel) {
      detail = output.locationLabel;
    } else if (part.type === 'tool-createBrickSession' && output.legs?.length) {
      const legLabels = output.legs
        .map((l) => l.title ?? (l.type ? activityTypeLabels[l.type as ActivityType] : null))
        .filter(Boolean);
      detail = [output.date, legLabels.join(' → ')].filter(Boolean).join(' · ') || null;
    } else {
      detail = [output.title, output.date].filter(Boolean).join(' · ') || null;
    }
  }

  function getStatusClassName(): string {
    if (isFailure) {
      return 'border-destructive/30 bg-destructive/5 text-destructive';
    }
    if (done) {
      return 'border-emerald-500/30 bg-emerald-500/5 text-emerald-700';
    }
    return 'border-border/60 bg-card/40 text-muted-foreground';
  }

  function statusIcon() {
    if (!done && !failed) return <Loader2 className="size-3.5 shrink-0 animate-spin" />;
    if (isFailure) return <X className="size-3.5 shrink-0" />;
    return <Icon className="size-3.5 shrink-0" />;
  }

  function statusLabel(): string {
    if (isFailure) return failureLabelForPart(part);
    if (done) return meta.label;
    return meta.running;
  }

  return (
    <div
      title={debugDetail ?? undefined}
      className={cn(
        'flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs',
        getStatusClassName(),
      )}
    >
      {statusIcon()}
      <span className="font-medium">{statusLabel()}</span>
      {detail ? <span className="truncate opacity-80">— {detail}</span> : null}
      {done && !isFailure && <Check className="ml-auto size-3 shrink-0" />}
    </div>
  );
}
