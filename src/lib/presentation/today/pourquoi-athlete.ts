/**
 * Athlete-facing « Pourquoi » copy for Today reliability (Design hotfix).
 * Deterministic FR prose — no machine packTier labels, no sync ages, no rationale codes.
 */

import { athletePackTierSummary } from '@/lib/presentation/today/pack-tier-athlete';

export type PourquoiAthleteInput = {
  readonly softHero: boolean;
  readonly packTier: 'FULL' | 'PARTIAL' | 'LOW' | 'INSUFFICIENT';
  readonly visibleGaps: readonly string[];
  readonly journalWeighted: boolean;
};

export type PourquoiAthleteCopy = {
  /** Collapsed summary — never a machine tier like FULL. */
  readonly summary: string | null;
  /**
   * Soft-hero gap bullets for the hero strip (outside Pourquoi).
   * Not repeated inside the Pourquoi body.
   */
  readonly gapBullets: readonly string[];
  /** Default Pourquoi body: 2–3 readable athlete sentences. */
  readonly sentences: readonly string[];
};

function noEmDash(text: string): string {
  return text.replace(/[—–]/g, '-');
}

/**
 * Build the Essential (non-Expert) Pourquoi reading.
 * Technical provenance stays behind Mode Expert in the UI.
 * Soft-hero gaps are listed once on the hero strip, not again inside Pourquoi.
 */
export function buildPourquoiAthleteCopy(input: PourquoiAthleteInput): PourquoiAthleteCopy {
  const gapBullets = input.softHero ? input.visibleGaps.slice(0, 2).map(noEmDash) : [];

  if (input.softHero) {
    const sentences = [
      noEmDash(
        input.packTier === 'INSUFFICIENT'
          ? 'Les signaux du matin ne suffisent pas encore pour un verdict ferme.'
          : "On s'appuie sur ce qui est déjà là, avec une orientation prudente.",
      ),
      noEmDash('Complète les sources manquantes ou attends la sync pour affiner la lecture.'),
    ];
    return {
      summary: athletePackTierSummary(input.packTier),
      gapBullets,
      sentences,
    };
  }

  const sentences = [
    noEmDash("Le verdict s'appuie sur ton sommeil, ta HRV et ta charge récente déjà synchronisés."),
    noEmDash(
      input.journalWeighted
        ? 'Ton objectif reste prioritaire ; le journal wellness compte déjà dans Recovery.'
        : "Ton objectif reste prioritaire ; le journal wellness n'est pas encore saisi.",
    ),
    noEmDash(
      input.journalWeighted
        ? 'Ton check-in matin compte déjà : humeur, énergie, corps et stress.'
        : 'Un check-in matin aidera Recovery à mieux pondérer la journée.',
    ),
  ];

  return {
    summary: athletePackTierSummary('FULL'),
    gapBullets: [],
    sentences,
  };
}
