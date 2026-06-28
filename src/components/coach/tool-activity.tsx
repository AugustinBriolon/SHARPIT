"use client";

import type { ActivityType } from "@prisma/client";
import {
  CalendarPlus,
  CalendarX2,
  Check,
  ListChecks,
  Loader2,
  PencilLine,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { activityTypeLabels } from "@/lib/format";
import { intensityLabels } from "@/lib/sessions";
import { cn } from "@/lib/utils";

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
  approval?: { id: string; isAutomatic?: boolean; approved?: boolean };
};

type Meta = {
  label: string;
  icon: typeof Check;
  running: string;
  proposal: string;
};

const META: Record<string, Meta> = {
  "tool-listPlannedSessions": {
    label: "Calendrier consulté",
    icon: ListChecks,
    running: "Consultation des séances…",
    proposal: "",
  },
  "tool-createPlannedSession": {
    label: "Séance ajoutée",
    icon: CalendarPlus,
    running: "Ajout de la séance…",
    proposal: "Ajouter une séance",
  },
  "tool-updatePlannedSession": {
    label: "Séance modifiée",
    icon: PencilLine,
    running: "Modification de la séance…",
    proposal: "Modifier une séance",
  },
  "tool-deletePlannedSession": {
    label: "Séance supprimée",
    icon: CalendarX2,
    running: "Suppression de la séance…",
    proposal: "Supprimer une séance",
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

  if (type === "tool-deletePlannedSession") {
    const headline = ref
      ? `${ref.title ?? "Séance"}${ref.date ? ` — ${ref.date}` : ""}`
      : "Séance ciblée";
    return { headline, lines: [] };
  }

  if (type === "tool-createPlannedSession") {
    const headline = input.title ?? "Nouvelle séance";
    const meta = [
      input.date,
      fmtType(input.type),
      input.intensity ? intensityLabels[input.intensity] : null,
      input.durationMin ? `${input.durationMin} min` : null,
      input.load ? `${input.load} TSS` : null,
    ]
      .filter(Boolean)
      .join(" · ");
    if (meta) lines.push(meta);
    if (input.description) lines.push(input.description);
    return { headline, lines };
  }

  // update : on n'affiche que ce qui change
  const headline = ref
    ? `${ref.title ?? "Séance"}${ref.date ? ` — ${ref.date}` : ""}`
    : (input.title ?? "Séance");
  if (input.date) lines.push(`Date → ${input.date}`);
  if (input.type) lines.push(`Type → ${fmtType(input.type)}`);
  if (input.intensity) lines.push(`Intensité → ${intensityLabels[input.intensity]}`);
  if (input.title) lines.push(`Titre → ${input.title}`);
  if (input.durationMin) lines.push(`Durée → ${input.durationMin} min`);
  if (input.load) lines.push(`Charge → ${input.load} TSS`);
  if (input.description) lines.push(input.description);
  return { headline, lines };
}

export function ToolActivity({
  part,
  knownSessions = {},
  onApproval,
  disabled,
}: {
  part: ToolPart;
  knownSessions?: Record<string, KnownSession>;
  onApproval?: (id: string, approved: boolean) => void;
  disabled?: boolean;
}) {
  const meta = META[part.type];
  if (!meta) return null;

  const Icon = meta.icon;
  const state = part.state;
  const isList = part.type === "tool-listPlannedSessions";

  // 1) Demande de validation : on affiche la proposition + boutons
  if (state === "approval-requested" && part.approval && !part.approval.isAutomatic) {
    const { headline, lines } = describeInput(
      part.type,
      (part.input ?? {}) as SessionInput,
      knownSessions,
    );
    const isDelete = part.type === "tool-deletePlannedSession";
    return (
      <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
        <div className="flex items-center gap-2 text-xs font-medium text-foreground">
          <Icon className="size-3.5 shrink-0 text-primary" />
          {meta.proposal}
        </div>
        <p className="mt-1.5 text-sm font-medium text-foreground">{headline}</p>
        {lines.length > 0 && (
          <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
            {lines.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex gap-2">
          <Button
            size="sm"
            variant={isDelete ? "destructive" : "default"}
            disabled={disabled}
            onClick={() => onApproval?.(part.approval!.id, true)}
          >
            <Check className="size-3.5" />
            {isDelete ? "Supprimer" : "Valider"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={disabled}
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
  if (state === "output-denied") {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/40 px-2.5 py-1.5 text-xs text-muted-foreground">
        <X className="size-3.5 shrink-0" />
        <span className="line-through">{meta.proposal}</span>
        <span className="opacity-70">— proposition refusée</span>
      </div>
    );
  }

  const done = state === "output-available";
  const failed = state === "output-error";
  const output = part.output as
    | { ok?: boolean; error?: string; title?: string | null; date?: string }
    | undefined;
  const koExec = done && output?.ok === false;

  let detail: string | null = null;
  if (done && !isList && output) {
    detail = koExec
      ? (output.error ?? "échec")
      : [output.title, output.date].filter(Boolean).join(" · ") || null;
  }

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-xs",
        failed || koExec
          ? "border-destructive/30 bg-destructive/5 text-destructive"
          : done
            ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300"
            : "border-border/60 bg-card/40 text-muted-foreground",
      )}
    >
      {done ? (
        <Icon className="size-3.5 shrink-0" />
      ) : (
        <Loader2 className="size-3.5 shrink-0 animate-spin" />
      )}
      <span className="font-medium">{done ? meta.label : meta.running}</span>
      {detail && <span className="truncate opacity-80">— {detail}</span>}
      {done && !failed && !koExec && (
        <Check className="ml-auto size-3 shrink-0" />
      )}
    </div>
  );
}
