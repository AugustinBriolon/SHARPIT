import { format, subDays } from 'date-fns';
import { fr } from 'date-fns/locale';

export type CoachProvenanceChip = {
  key: 'recovery' | 'sleep';
  label: string;
  /** Signal identity dot — matches the Today strip dimension dots. */
  dotClass: string;
};

/**
 * Provenance chips under coach replies — surfaces which athlete signals ground
 * the advice (Bande ink §6). Pure: renders nothing when a signal is missing.
 */
export function buildCoachProvenanceChips({
  recoveryScore,
  sleepScore,
  now = new Date(),
}: {
  recoveryScore: number | null;
  sleepScore: number | null;
  now?: Date;
}): CoachProvenanceChip[] {
  const chips: CoachProvenanceChip[] = [];

  if (recoveryScore != null) {
    chips.push({
      key: 'recovery',
      label: `Récup ${Math.round(recoveryScore)}`,
      dotClass: 'bg-[var(--color-signal-recovery)]',
    });
  }

  if (sleepScore != null) {
    // Last night is conventionally "la nuit du <veille>".
    const night = subDays(now, 1);
    chips.push({
      key: 'sleep',
      label: `Basé sur ta nuit du ${format(night, 'd MMMM', { locale: fr })}`,
      dotClass: 'bg-[var(--color-signal-base)]',
    });
  }

  return chips;
}
