/**
 * Soft-hero presentation rules for Science Sport reliability V0.
 * Softens hard verdicts when packTier !== FULL. Deterministic only.
 *
 * @see docs/design/confidence-brief-v0.md
 */

import {
  computePackTier,
  isHardVerdictRequiringFull,
  type PackInputSignals,
  type PackTier,
  type PackTierResult,
} from '@sharpit/core/science/pack-tier';
import type { OverallVerdict } from '@sharpit/server/athlete-state/today-state';

export type SoftHeroPresentation = {
  readonly packTier: PackTier;
  readonly pack: PackTierResult;
  readonly softHero: boolean;
  /** Hedged title when soft-hero; otherwise null (keep engine title). */
  readonly hedgedHeadline: string | null;
  readonly estimationChip: string | null;
  readonly visibleGaps: readonly string[];
  readonly ctaCompleteSources: boolean;
  /** Effective display verdict after soft-hero gating. */
  readonly displayVerdict: OverallVerdict;
  readonly withholdIntensityTopAction: boolean;
};

const HEDGED_HARD_HEADLINES: Record<string, string> = {
  TRAIN_HARD: 'Charge possible, estimation partielle',
  RACE_READY: 'Fenêtre possible, estimation partielle',
  TRAIN_SMART: 'Séance fine possible, estimation partielle',
};

const INSUFFICIENT_HEADLINE = 'Complète tes sources pour un bilan fiable';

export function resolveSoftHeroPresentation(input: {
  packInput: PackInputSignals;
  engineVerdict: OverallVerdict | null;
  gapLabels: readonly string[];
}): SoftHeroPresentation {
  const pack = computePackTier(input.packInput);
  const engineVerdict = input.engineVerdict ?? 'INSUFFICIENT_DATA';

  if (pack.packTier === 'INSUFFICIENT') {
    return {
      packTier: pack.packTier,
      pack,
      softHero: true,
      hedgedHeadline: INSUFFICIENT_HEADLINE,
      estimationChip: 'Données insuffisantes',
      visibleGaps: input.gapLabels,
      ctaCompleteSources: true,
      displayVerdict: 'INSUFFICIENT_DATA',
      withholdIntensityTopAction: true,
    };
  }

  if (pack.packTier === 'FULL') {
    return {
      packTier: pack.packTier,
      pack,
      softHero: false,
      hedgedHeadline: null,
      estimationChip: null,
      visibleGaps: [],
      ctaCompleteSources: false,
      displayVerdict: engineVerdict,
      withholdIntensityTopAction: false,
    };
  }

  // PARTIAL / LOW soft-hero
  const needsHedge = isHardVerdictRequiringFull(engineVerdict);
  const hedgedHeadline = needsHedge
    ? (HEDGED_HARD_HEADLINES[engineVerdict] ?? 'Estimation partielle')
    : null;

  return {
    packTier: pack.packTier,
    pack,
    softHero: true,
    hedgedHeadline,
    estimationChip: 'Estimation partielle',
    visibleGaps: input.gapLabels,
    ctaCompleteSources: false,
    // Keep engine verdict for posture colors, but never surface assertive hard copy without hedge.
    displayVerdict: needsHedge ? 'TRAIN_SMART' : engineVerdict,
    withholdIntensityTopAction: false,
  };
}
