import { formatPlannedDuration } from '@/lib/planned-session/sessions';
import type { MorningSessionSide } from '@/lib/today/morning-orientation';

export type MorningProposalCompareInput = {
  why: string;
  changeSummary: string;
  current: MorningSessionSide;
  proposed: MorningSessionSide;
};

export type MorningProposalCompareRow = {
  label: string;
  current: string;
  proposed: string;
  changed: boolean;
};

function formatDuration(min: number | null): string {
  if (min == null) return '—';
  return formatPlannedDuration(min);
}

function formatLoad(load: number | null): string {
  if (load == null) return '—';
  return `${Math.round(load)} TSS`;
}

/** Scalar rows for Plan vs proposée — intensity, duration, load. */
export function buildMorningProposalCompareRows(
  current: MorningSessionSide,
  proposed: MorningSessionSide,
): MorningProposalCompareRow[] {
  const intensityCurrent = current.intensityLabel ?? '—';
  const intensityProposed = proposed.intensityLabel ?? '—';
  const durationCurrent = formatDuration(current.durationMin);
  const durationProposed = formatDuration(proposed.durationMin);
  const loadCurrent = formatLoad(current.load);
  const loadProposed = formatLoad(proposed.load);

  return [
    {
      label: 'Intensité',
      current: intensityCurrent,
      proposed: intensityProposed,
      changed: intensityCurrent !== intensityProposed,
    },
    {
      label: 'Durée',
      current: durationCurrent,
      proposed: durationProposed,
      changed: durationCurrent !== durationProposed,
    },
    {
      label: 'Charge',
      current: loadCurrent,
      proposed: loadProposed,
      changed: loadCurrent !== loadProposed,
    },
  ];
}
