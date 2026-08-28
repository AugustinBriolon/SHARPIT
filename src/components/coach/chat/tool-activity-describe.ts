import type { ActivityType } from '@prisma/client';
import { activityTypeLabels } from '@/lib/format';
import { intensityLabels } from '@/lib/planned-session/sessions';
import type { KnownSession } from '@/components/coach/chat/tool-activity';

export type SessionInput = {
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

function fmtType(t?: ActivityType) {
  return t ? activityTypeLabels[t] : null;
}

function travelHeadline(type: string, travel: TravelInput) {
  if (travel.label?.trim()) {
    return travel.label.trim();
  }
  if (type === 'tool-setTravelContext') {
    return `Voyage · ${travel.locationLabel ?? 'Lieu'}`;
  }
  return 'Contrainte temporaire';
}

function travelDisciplineLine(travel: TravelInput): string | null {
  if (travel.noStructuredTraining) {
    return 'Aucun sport structuré';
  }
  if (travel.allowedDisciplines && travel.allowedDisciplines.length > 0) {
    const labels: Record<(typeof travel.allowedDisciplines)[number], string> = {
      RUN: 'Course',
      BIKE: 'Vélo',
      SWIM: 'Natation',
      STRENGTH: 'Renfo',
      MOBILITY: 'Mobilité',
    };
    return travel.allowedDisciplines.map((d) => labels[d]).join(' · ');
  }
  if (travel.trainingConstraint && travel.trainingConstraint !== 'FULL') {
    const constraintLabels = {
      REDUCED: 'Entraînement réduit',
      MOBILITY_ONLY: 'Mobilité uniquement',
      NONE: 'Pas d’entraînement structuré',
    } as const;
    return constraintLabels[travel.trainingConstraint];
  }
  return null;
}

function describeTravelInput(type: string, input: SessionInput) {
  const travel = input as unknown as TravelInput;
  const lines: string[] = [];
  const headline = travelHeadline(type, travel);

  if (travel.startDate && travel.endDate) {
    lines.push(`${travel.startDate} → ${travel.endDate}`);
  }
  if (type === 'tool-setTravelContext' && travel.locationLabel) {
    lines.push(travel.locationLabel);
  }
  const disciplineLine = travelDisciplineLine(travel);
  if (disciplineLine) {
    lines.push(disciplineLine);
  }
  if (travel.note) {
    lines.push(travel.note);
  }
  return { headline, lines };
}

function describeDeleteSession(ref: KnownSession | undefined) {
  const headline = ref
    ? `${ref.title ?? 'Séance'}${ref.date ? ` — ${ref.date}` : ''}`
    : 'Séance ciblée';
  return { headline, lines: [] as string[] };
}

function brickLegLine(leg: {
  type?: ActivityType;
  intensity?: keyof typeof intensityLabels;
  title?: string;
  durationMin?: number;
  load?: number;
}) {
  const legMeta = [
    fmtType(leg.type),
    leg.intensity ? intensityLabels[leg.intensity] : null,
    leg.durationMin ? `${leg.durationMin} min` : null,
    leg.load ? `${leg.load} TSS` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  return `${leg.title ?? fmtType(leg.type) ?? 'Étape'}${legMeta ? ` — ${legMeta}` : ''}`;
}

function describeBrickSession(input: SessionInput) {
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
  const lines: string[] = [];
  const headline = brick.title ?? 'Brick (multisport)';
  if (brick.date) {
    lines.push(brick.date);
  }
  for (const leg of brick.legs ?? []) {
    lines.push(brickLegLine(leg));
  }
  return { headline, lines };
}

function sessionMetaLine(input: SessionInput) {
  return [
    input.date,
    fmtType(input.type),
    input.intensity ? intensityLabels[input.intensity] : null,
    input.durationMin ? `${input.durationMin} min` : null,
    input.load ? `${input.load} TSS` : null,
  ]
    .filter(Boolean)
    .join(' · ');
}

function describeCreateSession(input: SessionInput) {
  const lines: string[] = [];
  const headline = input.title ?? 'Nouvelle séance';
  const meta = sessionMetaLine(input);
  if (meta) {
    lines.push(meta);
  }
  if (input.description) {
    lines.push(input.description);
  }
  lines.push(...strengthPrescriptionLines(input.strengthPrescription?.sets?.length ?? 0));
  return { headline, lines };
}

function strengthPrescriptionLines(exoCount: number) {
  if (exoCount <= 0) {
    return [];
  }
  return [`${exoCount} exercice${exoCount > 1 ? 's' : ''} prescrits`];
}

function updateSessionLines(input: SessionInput, ref: KnownSession | undefined) {
  const entries: Array<[unknown, string]> = [
    [input.date, `Date → ${input.date}`],
    [input.type, `Type → ${fmtType(input.type)}`],
    [input.intensity, `Intensité → ${intensityLabels[input.intensity!]}`],
    [input.title, `Titre → ${input.title}`],
    [input.durationMin, `Durée → ${input.durationMin} min`],
    [input.load, `Charge → ${input.load} TSS`],
    [input.startTime, `Heure → ${input.startTime}`],
    [input.locationLabel, `Lieu → ${input.locationLabel}`],
  ];
  const lines = entries.filter(([value]) => Boolean(value)).map(([, text]) => text);
  if (input.exposureSetting) {
    lines.push(`Exposition → ${EXPOSURE_LABELS[input.exposureSetting]}`);
  }
  lines.push(...strengthPrescriptionLines(input.strengthPrescription?.sets?.length ?? 0));
  if (input.description) {
    lines.push(input.description);
  }
  if (lines.length === 0 && ref) {
    lines.push('Mise à jour sans détail supplémentaire');
  }
  return lines;
}

function formatSessionRefTitle(ref: KnownSession) {
  const title = ref.title ?? fmtType(ref.type ?? undefined) ?? 'Séance';
  return ref.date ? `${title} — ${ref.date}` : title;
}

function updateSessionHeadline(input: SessionInput, ref: KnownSession | undefined) {
  if (ref) {
    return formatSessionRefTitle(ref);
  }
  return input.title ?? 'Séance';
}

function describeUpdateSession(input: SessionInput, ref: KnownSession | undefined) {
  return {
    headline: updateSessionHeadline(input, ref),
    lines: updateSessionLines(input, ref),
  };
}

export function describeToolInput(
  type: string,
  input: SessionInput,
  known: Record<string, KnownSession>,
): { headline: string; lines: string[] } {
  const ref = input.id ? known[input.id] : undefined;

  if (type === 'tool-setTravelContext' || type === 'tool-setTrainingConstraint') {
    return describeTravelInput(type, input);
  }
  if (type === 'tool-deletePlannedSession') {
    return describeDeleteSession(ref);
  }
  if (type === 'tool-createBrickSession') {
    return describeBrickSession(input);
  }
  if (type === 'tool-createPlannedSession') {
    return describeCreateSession(input);
  }
  return describeUpdateSession(input, ref);
}
