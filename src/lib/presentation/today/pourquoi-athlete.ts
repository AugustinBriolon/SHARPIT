/**
 * Athlete-facing « Pourquoi » copy for Today reliability (Design hotfix).
 * Deterministic FR prose — no machine packTier labels, no sync ages, no rationale codes.
 */

export type PourquoiAthleteInput = {
  readonly softHero: boolean;
  readonly packTier: 'FULL' | 'PARTIAL' | 'LOW' | 'INSUFFICIENT';
  readonly visibleGaps: readonly string[];
  readonly goalVsJournalWeight: string;
  readonly journalWeighted: boolean;
};

export type PourquoiAthleteCopy = {
  /** Collapsed summary — never a machine tier like FULL. */
  readonly summary: string | null;
  /** Soft-hero: 1–2 short FR gap bullets. */
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
 */
export function buildPourquoiAthleteCopy(input: PourquoiAthleteInput): PourquoiAthleteCopy {
  const gapBullets = input.softHero ? input.visibleGaps.slice(0, 2).map(noEmDash) : [];

  if (input.softHero) {
    const sentences = [
      noEmDash(
        input.packTier === 'INSUFFICIENT'
          ? 'Les signaux du matin ne suffisent pas encore pour un verdict ferme.'
          : 'On s\'appuie sur ce qui est déjà là, avec une orientation prudente.',
      ),
      noEmDash(
        'Complète les sources manquantes ou attends la sync pour affiner la lecture.',
      ),
    ];
    return {
      summary: input.packTier === 'INSUFFICIENT' ? 'Données insuffisantes' : 'Estimation partielle',
      gapBullets,
      sentences,
    };
  }

  const sentences = [
    noEmDash(
      'Le verdict s\'appuie sur ton sommeil, ta HRV et ta charge récente déjà synchronisés.',
    ),
    noEmDash(input.goalVsJournalWeight),
    noEmDash(
      input.journalWeighted
        ? 'Ton check-in matin compte déjà dans Recovery : humeur, énergie, corps et stress.'
        : 'Un check-in matin aidera Recovery à mieux pondérer la journée.',
    ),
  ];

  return {
    summary: null,
    gapBullets: [],
    sentences,
  };
}
