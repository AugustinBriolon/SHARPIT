/**
 * Assemble Science Sport reliability block for Today hero presentation.
 */

import type { AthleteSnapshot } from '@sharpit/app/athlete-state/snapshot';
import type { OverallVerdict } from '@sharpit/app/athlete-state/today-state';
import type { PackTier } from '@sharpit/core/science/pack-tier';
import { resolveCode } from '@sharpit/app/lib/french';
import { buildPackInputsFromSnapshot } from '@sharpit/server/lib/science/reliability/pack-inputs-from-snapshot';
import {
  buildReliabilityProvenance,
  type ReliabilityProvenance,
} from '@sharpit/server/lib/science/reliability/provenance';
import { resolveSoftHeroPresentation } from '@sharpit/server/lib/science/reliability/soft-hero';

export type TodayHeroReliability = {
  readonly packTier: PackTier;
  readonly softHero: boolean;
  readonly estimationChip: string | null;
  readonly visibleGaps: readonly string[];
  readonly ctaCompleteSources: boolean;
  readonly withholdIntensityTopAction: boolean;
  readonly provenance: ReliabilityProvenance;
};

export function buildTodayHeroReliability(
  snapshot: AthleteSnapshot,
  engineVerdict: OverallVerdict | null,
): {
  reliability: TodayHeroReliability;
  effectiveHeadlineOverride: string | null;
  displayVerdict: OverallVerdict;
} {
  const packInput = buildPackInputsFromSnapshot(snapshot);
  const rationaleCodes = [
    snapshot.decision?.primaryDecision?.rationaleCode,
    snapshot.reasoning?.topAction?.rationaleCode,
  ].filter((c): c is string => Boolean(c));

  const softPreview = resolveSoftHeroPresentation({
    packInput,
    engineVerdict,
    gapLabels: [],
  });

  const provenance = buildReliabilityProvenance({
    pack: softPreview.pack,
    sleepNightAgeHours: packInput.sleepNightAgeHours,
    morningHrvAgeHours: packInput.morningHrvAgeHours,
    hrvBaselineDays: packInput.hrvBaselineDays,
    loadSyncAgeHours: packInput.loadSyncAgeHours,
    loadDaysCoveredIn7: packInput.loadDaysCoveredIn7,
    journalWeighted: Boolean(snapshot.recovery?.dimensions.subjective.available),
    rationaleCodes,
    resolveRationale: resolveCode,
  });

  const soft = resolveSoftHeroPresentation({
    packInput,
    engineVerdict,
    gapLabels: provenance.gapLabels,
  });

  return {
    reliability: {
      packTier: soft.packTier,
      softHero: soft.softHero,
      estimationChip: soft.estimationChip,
      visibleGaps: soft.visibleGaps,
      ctaCompleteSources: soft.ctaCompleteSources,
      withholdIntensityTopAction: soft.withholdIntensityTopAction,
      provenance,
    },
    effectiveHeadlineOverride: soft.hedgedHeadline,
    displayVerdict: soft.displayVerdict,
  };
}
