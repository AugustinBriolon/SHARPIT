/**
 * Athlete-facing packTier presentation (Design soft-hero nits).
 * Machine enums stay internal — athletes never see raw FULL / PARTIAL / …
 */

import { CAUTION_TONE } from '@sharpit/app/lib/presentation/coaching/status-surface';

export type AthletePackTier = 'FULL' | 'PARTIAL' | 'LOW' | 'INSUFFICIENT';

/** French packTier label for athletes — never a machine tier like FULL. */
export function athletePackTierSummary(packTier: AthletePackTier): string {
  if (packTier === 'FULL') {
    return 'Complet';
  }
  if (packTier === 'INSUFFICIENT') {
    return 'Données insuffisantes';
  }
  return 'Estimation partielle';
}

/**
 * Ink-band status dot beside the hero eyebrow.
 * FULL keeps Lime Pulse; PARTIAL/LOW → caution amber; INSUFFICIENT → muted gray.
 */
export function packTierInkDotClass(packTier: AthletePackTier | null | undefined): string {
  if (packTier === 'PARTIAL' || packTier === 'LOW') {
    return CAUTION_TONE.dotClass;
  }
  if (packTier === 'INSUFFICIENT') {
    return 'bg-ink-surface-foreground/40';
  }
  // FULL or unknown — Lime Pulse on ink (dark: flip to ink fg for contrast)
  return 'bg-highlight dark:bg-ink-surface-foreground';
}

/** ConfidenceBars tone on the ink plate, keyed by packTier. */
export function packTierConfidenceBarsTone(
  packTier: AthletePackTier | null | undefined,
): 'highlight' | 'caution' | 'muted' {
  if (packTier === 'PARTIAL' || packTier === 'LOW') {
    return 'caution';
  }
  if (packTier === 'INSUFFICIENT') {
    return 'muted';
  }
  return 'highlight';
}
