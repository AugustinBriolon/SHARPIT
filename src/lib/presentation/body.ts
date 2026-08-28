import type {
  BodyMetricCardVm,
  BodyMetricExplainerVm,
  BodyTrendWindowId,
  BodyViewModel,
} from '@/core/presentation/body-view-model';
import { athleteCompositionContext } from '@/lib/profile/athlete-profile-utils';
import { isSet } from '@/lib/util/value';
import {
  buildCompositionSeries,
  computeCompositionTrend,
  formatCompositionDelta,
  formatWeightKgDisplay,
} from '@/lib/health/body-composition';
import {
  getGuide,
  metricScalePosition,
  type CompositionContext,
  type CompositionMetricId,
} from '@/lib/health/composition-metric-guides';
import { buildWeeklyDeltaPresentation, resolveMetricValueTone } from '@/lib/health/health-status';
import { buildBodyPageInsights } from '@/lib/product-insight/body-page-insights';
import { getAthleteProfile, getBodyCompositionMeasurements } from '@/lib/queries';
import { parseWithingsEcgStats } from '@/lib/integrations/withings/withings-ecg-display';

const TREND_WINDOWS = [
  { id: '14d', label: '14 j', days: 14 },
  { id: '30d', label: '30 j', days: 30 },
  { id: '90d', label: '90 j', days: 90 },
  { id: '1y', label: '1 an', days: 365 },
  { id: 'all', label: 'Tout', days: null },
] as const satisfies ReadonlyArray<{ id: BodyTrendWindowId; label: string; days: number | null }>;

const AGE_COMPARED_METRICS: CompositionMetricId[] = ['vascularAgeYears', 'metabolicAge', 'bmi'];

function heightFromWithingsExtras(extras: unknown): number | null {
  if (extras === undefined || extras === null || typeof extras !== 'object') {
    return null;
  }
  const maybe = extras as Record<string, unknown>;
  const h = maybe.heightM;
  return typeof h === 'number' && h > 0 ? h : null;
}

function sourceLabel(source: string | null | undefined): string | null {
  if (source === undefined || source === null) {
    return null;
  }
  if (source === 'WITHINGS') {
    return 'Withings';
  }
  return 'Renpho';
}

function inferActiveTrendWindowId(days: number | null | undefined): BodyTrendWindowId {
  if (days === undefined || days === null) {
    return 'all';
  }
  if (days === 14) {
    return '14d';
  }
  if (days === 30) {
    return '30d';
  }
  if (days === 90) {
    return '90d';
  }
  if (days === 365) {
    return '1y';
  }
  return 'all';
}

function displayMeasuredAt(date: Date | null | undefined): string | null {
  if (!date) {
    return null;
  }
  return date.toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' });
}

function buildExplainerVm(args: {
  metricId: CompositionMetricId;
  rawValue: number;
  displayValue: string;
  context: CompositionContext;
}): BodyMetricExplainerVm {
  const guide = getGuide(args.metricId);
  const interpretation = guide.interpret(args.rawValue, args.context);

  const scaleInput = guide.scaleValue ? guide.scaleValue(args.rawValue) : args.rawValue;
  const scaleMarkerPct = !guide.hideScale ? metricScalePosition(scaleInput, guide.zones) : null;

  const showProfileAgeHint =
    AGE_COMPARED_METRICS.includes(args.metricId) &&
    (args.context.chronologicalAgeYears === undefined ||
      args.context.chronologicalAgeYears === null);
  const showAgeComparisonNote =
    AGE_COMPARED_METRICS.includes(args.metricId) && isSet(args.context.chronologicalAgeYears);

  return {
    metricId: args.metricId,
    guideTitle: guide.title,
    guideSummary: guide.summary,
    guideExplanation: guide.explanation,
    guideUnit: guide.unit,
    displayValue: args.displayValue,
    interpretation,
    hideScale: Boolean(guide.hideScale),
    zones: guide.zones,
    scaleMarkerPct,
    showProfileAgeHint,
    showAgeComparisonNote,
    chronologicalAgeYears: args.context.chronologicalAgeYears,
  };
}

function emptyHeroMini(): BodyViewModel['hero']['heroMini'] {
  const emptyMetric = {
    value: null,
    deltaDisplay: null,
    deltaTone: 'ok' as const,
    deltaHint: null,
    tone: 'neutral' as const,
  };
  return {
    bodyFatPct: emptyMetric,
    musclePct: emptyMetric,
    visceralFat: emptyMetric,
    waterPct: emptyMetric,
  };
}

function emptyBodyPresentationViewModel(
  activeTrendWindowId: BodyTrendWindowId,
  trendWindows: BodyViewModel['trendWindows'],
): BodyViewModel {
  return {
    hasData: false,
    emptyState: {
      title: 'Aucune mesure importée',
      description: 'Connecte Withings ou Renpho dans les réglages pour synchroniser ta balance.',
    },
    trendWindows,
    activeTrendWindowId,
    insights: { primary: [], supporting: [], contextual: [] },
    hero: {
      latestWeightKg: null,
      latestWeightDisplay: '—',
      measuredAtLabel: null,
      sourceLabel: null,
      weightDeltaDisplay: null,
      weightDeltaTone: null,
      weightDeltaHint: null,
      heroMini: emptyHeroMini(),
    },
    context: { chronologicalAgeYears: null },
    hasBodyScan: false,
    trajectoryCards: [],
    contextCards: [],
    healthScanCards: [],
    chartData: [],
    explainerByMetricId: {},
    hierarchy: { rootId: 'body', order: ['hero', 'insights', 'sections', 'trends'] },
  };
}

function buildMetricDeltaFooter(
  metricId: 'bmi' | 'bodyFatPct' | 'musclePct' | 'visceralFat',
  delta7d: number | null | undefined,
) {
  const presentation = buildWeeklyDeltaPresentation(metricId, delta7d, (delta) =>
    formatCompositionDelta(delta, ' pts vs 7j'),
  );
  if (presentation.deltaDisplay === undefined || presentation.deltaDisplay === null) {
    return null;
  }
  return {
    footer: presentation.deltaDisplay,
    footerTone: presentation.deltaTone,
    footerHint: presentation.deltaHint,
  };
}

function buildTrendHeroMiniMetric(input: {
  metricId: CompositionMetricId;
  latest: number | null;
  delta: number | null;
  compositionContext: CompositionContext;
}) {
  const delta = buildWeeklyDeltaPresentation(
    input.metricId as Parameters<typeof buildWeeklyDeltaPresentation>[0],
    input.delta,
    (d) => formatCompositionDelta(d, ' pts'),
  );
  const zoneTone = isSet(input.latest)
    ? getGuide(input.metricId).interpret(input.latest, input.compositionContext).tone
    : 'neutral';
  return {
    value: input.latest,
    deltaDisplay: delta.deltaDisplay,
    deltaTone: delta.deltaTone,
    deltaHint: delta.deltaHint,
    tone: isSet(input.latest)
      ? resolveMetricValueTone(zoneTone, input.metricId, input.delta)
      : 'neutral',
    guideId: input.metricId,
  };
}

function buildWaterHeroMiniMetric(
  water: ReturnType<typeof computeCompositionTrend>,
  compositionContext: CompositionContext,
) {
  const zoneTone = isSet(water.latest)
    ? getGuide('waterPct').interpret(water.latest, compositionContext).tone
    : 'neutral';
  return {
    value: water.latest,
    deltaDisplay: isSet(water.delta) ? (formatCompositionDelta(water.delta, ' pts') ?? null) : null,
    deltaTone: 'ok' as const,
    deltaHint: null,
    tone: zoneTone,
    guideId: 'waterPct' as CompositionMetricId,
  };
}

type BodyMeasurementEntry = NonNullable<
  Awaited<ReturnType<typeof getBodyCompositionMeasurements>>
>[number];

function computeBodyCompositionTrends(entries: BodyMeasurementEntry[]) {
  return {
    weight: computeCompositionTrend(entries, 'weightKg'),
    bodyFat: computeCompositionTrend(entries, 'bodyFatPct'),
    muscle: computeCompositionTrend(entries, 'musclePct'),
    visceral: computeCompositionTrend(entries, 'visceralFat'),
    water: computeCompositionTrend(entries, 'waterPct'),
    bmi: computeCompositionTrend(entries, 'bmi'),
  };
}

function buildBodyHeroSection(input: {
  latest: BodyMeasurementEntry;
  compositionContext: CompositionContext;
  trends: ReturnType<typeof computeBodyCompositionTrends>;
}): BodyViewModel['hero'] {
  const { latest, compositionContext, trends } = input;
  const weightDelta = buildWeeklyDeltaPresentation('weightKg', trends.weight.delta, (delta) =>
    formatCompositionDelta(delta, ' kg'),
  );
  return {
    latestWeightKg: latest.weightKg ?? null,
    latestWeightDisplay: isSet(latest.weightKg) ? formatWeightKgDisplay(latest.weightKg) : '—',
    measuredAtLabel: displayMeasuredAt(latest.measuredAt),
    sourceLabel: sourceLabel(latest.source),
    weightDeltaDisplay: weightDelta.deltaDisplay,
    weightDeltaTone: isSet(trends.weight.delta) ? weightDelta.deltaTone : null,
    weightDeltaHint: weightDelta.deltaHint,
    heroMini: {
      bodyFatPct: buildTrendHeroMiniMetric({
        metricId: 'bodyFatPct',
        latest: trends.bodyFat.latest,
        delta: trends.bodyFat.delta,
        compositionContext,
      }),
      musclePct: buildTrendHeroMiniMetric({
        metricId: 'musclePct',
        latest: trends.muscle.latest,
        delta: trends.muscle.delta,
        compositionContext,
      }),
      visceralFat: buildTrendHeroMiniMetric({
        metricId: 'visceralFat',
        latest: trends.visceral.latest,
        delta: trends.visceral.delta,
        compositionContext,
      }),
      waterPct: buildWaterHeroMiniMetric(trends.water, compositionContext),
    },
  };
}

function createBodyExplainerEnsurer(compositionContext: CompositionContext): {
  explainerByMetricId: BodyViewModel['explainerByMetricId'];
  ensureExplainer: (
    metricId: CompositionMetricId,
    raw: number | null | undefined,
    display: string | null | undefined,
  ) => void;
} {
  const explainerByMetricId: BodyViewModel['explainerByMetricId'] = {};
  const ensureExplainer = (
    metricId: CompositionMetricId,
    raw: number | null | undefined,
    display: string | null | undefined,
  ) => {
    if (
      raw === undefined ||
      raw === null ||
      display === undefined ||
      display === null ||
      explainerByMetricId[metricId]
    ) {
      return;
    }
    explainerByMetricId[metricId] = buildExplainerVm({
      metricId,
      rawValue: raw,
      displayValue: display,
      context: compositionContext,
    });
  };
  return { explainerByMetricId, ensureExplainer };
}

function measurementHasBodyScan(latest: BodyMeasurementEntry, ecgStatCount: number) {
  return (
    isSet(latest.vascularAgeYears) ||
    isSet(latest.nerveHealthScore) ||
    isSet(latest.pulseWaveVelocity) ||
    isSet(latest.skinConductance) ||
    isSet(latest.vo2Max) ||
    ecgStatCount > 0
  );
}

async function buildPopulatedBodyPresentationViewModel(input: {
  athleteId: string;
  entries: BodyMeasurementEntry[];
  activeTrendWindowId: BodyTrendWindowId;
  trendWindows: BodyViewModel['trendWindows'];
}): Promise<BodyViewModel> {
  const latest = input.entries[0]!;
  const profile = await getAthleteProfile(input.athleteId);
  const baseCtx = athleteCompositionContext(profile);
  const heightM = baseCtx.heightM ?? heightFromWithingsExtras(latest.withingsExtras);
  const compositionContext: CompositionContext = {
    heightM,
    weightKg: latest.weightKg ?? null,
    chronologicalAgeYears: baseCtx.chronoAge,
  };

  const trends = computeBodyCompositionTrends(input.entries);
  const latestBmiDisplay = latest.bmi ?? trends.bmi.latest ?? null;
  const chartData = buildCompositionSeries(input.entries);
  const hero = buildBodyHeroSection({ latest, compositionContext, trends });

  const insights = buildBodyPageInsights({
    bodyFatDelta7d: trends.bodyFat.delta,
    latestWeightKg: trends.weight.latest,
    measuredAtLabel: hero.measuredAtLabel,
    sourceLabel: hero.sourceLabel,
    visceralFat: trends.visceral.latest,
    waterPercent: latest.waterPct ?? null,
    weightDelta7d: trends.weight.delta,
  });

  const { explainerByMetricId, ensureExplainer } = createBodyExplainerEnsurer(compositionContext);
  const trajectoryCards = buildBodyTrajectoryCards({
    latest,
    latestBmiDisplay,
    bmi: trends.bmi,
    bodyFat: trends.bodyFat,
    muscle: trends.muscle,
    visceral: trends.visceral,
    compositionContext,
    ensureExplainer,
  });
  const contextCards = buildBodyContextCards(latest, compositionContext, ensureExplainer);
  const { healthScanCards, ecgStats } = buildBodyHealthScanCards(
    latest,
    compositionContext,
    ensureExplainer,
  );

  return {
    hasData: true,
    emptyState: null,
    trendWindows: input.trendWindows,
    activeTrendWindowId: input.activeTrendWindowId,
    insights,
    hero,
    context: { chronologicalAgeYears: compositionContext.chronologicalAgeYears },
    hasBodyScan: measurementHasBodyScan(latest, ecgStats.length),
    trajectoryCards,
    contextCards,
    healthScanCards,
    chartData,
    explainerByMetricId,
    hierarchy: { rootId: 'body', order: ['hero', 'insights', 'sections', 'trends'] },
  };
}

function buildBmiTrajectoryCard(input: {
  latestBmiDisplay: number;
  bmi: ReturnType<typeof computeCompositionTrend>;
  compositionContext: CompositionContext;
  ensureExplainer: (
    metricId: CompositionMetricId,
    raw: number | null | undefined,
    display: string | null | undefined,
  ) => void;
}): BodyMetricCardVm {
  const metricId: CompositionMetricId = 'bmi';
  const valueDisplay = `${input.latestBmiDisplay}`;
  const guide = getGuide(metricId);
  const interpretation = guide.interpret(input.latestBmiDisplay, input.compositionContext);
  input.ensureExplainer(metricId, input.latestBmiDisplay, valueDisplay);
  const bmiDeltaFooter = buildMetricDeltaFooter('bmi', input.bmi.delta);
  return {
    cardId: metricId,
    guideId: metricId,
    label: 'IMC',
    valueDisplay,
    footer: bmiDeltaFooter?.footer ?? 'Repère poids / taille²',
    footerTone: bmiDeltaFooter?.footerTone,
    footerHint: bmiDeltaFooter?.footerHint ?? undefined,
    tone: resolveMetricValueTone(interpretation.tone, metricId, input.bmi.delta),
  };
}

function registerTrajectoryMetricExplainers(input: {
  bodyFat: ReturnType<typeof computeCompositionTrend>;
  muscle: ReturnType<typeof computeCompositionTrend>;
  visceral: ReturnType<typeof computeCompositionTrend>;
  latest: BodyMeasurementEntry;
  ensureExplainer: (
    metricId: CompositionMetricId,
    raw: number | null | undefined,
    display: string | null | undefined,
  ) => void;
}) {
  if (isSet(input.bodyFat.latest)) {
    input.ensureExplainer('bodyFatPct', input.bodyFat.latest, `${input.bodyFat.latest} %`);
  }
  if (isSet(input.muscle.latest)) {
    input.ensureExplainer('musclePct', input.muscle.latest, `${input.muscle.latest} %`);
  }
  if (isSet(input.visceral.latest)) {
    input.ensureExplainer('visceralFat', input.visceral.latest, `${input.visceral.latest}`);
  }
  if (isSet(input.latest.waterPct)) {
    input.ensureExplainer(
      'waterPct',
      input.latest.waterPct,
      `${input.latest.waterPct.toFixed(1)} %`,
    );
  }
}

function buildBodyMassTrajectoryCards(latest: BodyMeasurementEntry): BodyMetricCardVm[] {
  const cards: BodyMetricCardVm[] = [];
  if (isSet(latest.fatFreeWeightKg)) {
    cards.push({
      cardId: 'fatFreeWeightKg',
      label: 'Masse maigre',
      valueDisplay: `${latest.fatFreeWeightKg.toFixed(1)} kg`,
      tone: 'neutral',
    });
  }
  if (isSet(latest.boneKg)) {
    cards.push({
      cardId: 'boneKg',
      label: 'Masse osseuse',
      valueDisplay: `${latest.boneKg.toFixed(2)} kg`,
      tone: 'neutral',
    });
  }
  return cards;
}

function buildBodyTrajectoryCards(input: {
  latest: BodyMeasurementEntry;
  latestBmiDisplay: number | null;
  bmi: ReturnType<typeof computeCompositionTrend>;
  bodyFat: ReturnType<typeof computeCompositionTrend>;
  muscle: ReturnType<typeof computeCompositionTrend>;
  visceral: ReturnType<typeof computeCompositionTrend>;
  compositionContext: CompositionContext;
  ensureExplainer: (
    metricId: CompositionMetricId,
    raw: number | null | undefined,
    display: string | null | undefined,
  ) => void;
}): BodyMetricCardVm[] {
  const cards: BodyMetricCardVm[] = [];
  if (isSet(input.latestBmiDisplay)) {
    cards.push(
      buildBmiTrajectoryCard({
        latestBmiDisplay: input.latestBmiDisplay,
        bmi: input.bmi,
        compositionContext: input.compositionContext,
        ensureExplainer: input.ensureExplainer,
      }),
    );
  }
  registerTrajectoryMetricExplainers({
    bodyFat: input.bodyFat,
    muscle: input.muscle,
    visceral: input.visceral,
    latest: input.latest,
    ensureExplainer: input.ensureExplainer,
  });
  cards.push(...buildBodyMassTrajectoryCards(input.latest));
  return cards;
}

function buildBodyContextCards(
  latest: BodyMeasurementEntry,
  compositionContext: CompositionContext,
  ensureExplainer: (
    metricId: CompositionMetricId,
    raw: number | null | undefined,
    display: string | null | undefined,
  ) => void,
): BodyMetricCardVm[] {
  const cards: BodyMetricCardVm[] = [];
  if (isSet(latest.bmr)) {
    const metricId: CompositionMetricId = 'bmr';
    const valueDisplay = `${Math.round(latest.bmr)} kcal`;
    ensureExplainer(metricId, latest.bmr, valueDisplay);
    cards.push({
      cardId: metricId,
      guideId: metricId,
      label: 'Métabolisme basal',
      valueDisplay,
      tone: getGuide(metricId).interpret(latest.bmr, compositionContext).tone,
    });
  }
  if (isSet(latest.metabolicAge)) {
    const metricId: CompositionMetricId = 'metabolicAge';
    const valueDisplay = `${latest.metabolicAge} ans`;
    ensureExplainer(metricId, latest.metabolicAge, valueDisplay);
    cards.push({
      cardId: metricId,
      guideId: metricId,
      label: 'Âge métabolique',
      valueDisplay,
      tone: getGuide(metricId).interpret(latest.metabolicAge, compositionContext).tone,
    });
  }
  return cards;
}

function pushGuideHealthScanCard(
  cards: BodyMetricCardVm[],
  input: {
    metricId: CompositionMetricId;
    label: string;
    valueDisplay: string;
    rawValue: number;
    compositionContext: CompositionContext;
    ensureExplainer: (
      metricId: CompositionMetricId,
      raw: number | null | undefined,
      display: string | null | undefined,
    ) => void;
  },
): void {
  input.ensureExplainer(input.metricId, input.rawValue, input.valueDisplay);
  cards.push({
    cardId: input.metricId,
    guideId: input.metricId,
    label: input.label,
    valueDisplay: input.valueDisplay,
    tone: getGuide(input.metricId).interpret(input.rawValue, input.compositionContext).tone,
  });
}

function buildBodyHealthScanCards(
  latest: BodyMeasurementEntry,
  compositionContext: CompositionContext,
  ensureExplainer: (
    metricId: CompositionMetricId,
    raw: number | null | undefined,
    display: string | null | undefined,
  ) => void,
): { healthScanCards: BodyMetricCardVm[]; ecgStats: ReturnType<typeof parseWithingsEcgStats> } {
  const cards: BodyMetricCardVm[] = [];
  const ecgStats = parseWithingsEcgStats(latest.withingsExtras);
  const scanMetrics: Array<{
    metricId: CompositionMetricId;
    label: string;
    raw: number | null;
    display: (value: number) => string;
  }> = [
    {
      metricId: 'vascularAgeYears',
      label: 'Âge vasculaire',
      raw: latest.vascularAgeYears,
      display: (v) => `${v} ans`,
    },
    {
      metricId: 'pulseWaveVelocity',
      label: 'Onde de pouls (PWV)',
      raw: latest.pulseWaveVelocity,
      display: (v) => `${v.toFixed(1)} m/s`,
    },
    {
      metricId: 'nerveHealthScore',
      label: 'Santé nerveuse',
      raw: latest.nerveHealthScore,
      display: (v) => `${Math.round(v)}`,
    },
    {
      metricId: 'nerveResponseScore',
      label: 'Réponse nerveuse',
      raw: latest.nerveResponseScore,
      display: (v) => `${Math.round(v)}`,
    },
    {
      metricId: 'skinConductance',
      label: 'Conductance (ESC)',
      raw: latest.skinConductance,
      display: (v) => `${v.toFixed(0)}`,
    },
    {
      metricId: 'vo2Max',
      label: 'VO₂ max est.',
      raw: latest.vo2Max,
      display: (v) => `${v.toFixed(1)} ml/kg/min`,
    },
    {
      metricId: 'heartRate',
      label: 'FC debout',
      raw: latest.heartRate,
      display: (v) => `${v} bpm`,
    },
  ];

  for (const metric of scanMetrics) {
    if (metric.raw === undefined || metric.raw === null) {
      continue;
    }
    pushGuideHealthScanCard(cards, {
      metricId: metric.metricId,
      label: metric.label,
      valueDisplay: metric.display(metric.raw),
      rawValue: metric.raw,
      compositionContext,
      ensureExplainer,
    });
  }

  for (const stat of ecgStats) {
    const metricId = stat.guideId as CompositionMetricId;
    ensureExplainer(metricId, stat.value, stat.displayValue);
    cards.push({
      cardId: metricId,
      guideId: metricId,
      label: stat.label,
      valueDisplay: stat.displayValue,
      tone: getGuide(metricId).interpret(stat.value, compositionContext).tone,
    });
  }

  return { healthScanCards: cards, ecgStats };
}

export async function buildBodyPresentationViewModel(
  athleteId: string,
  days?: number | null,
): Promise<BodyViewModel> {
  const activeTrendWindowId = inferActiveTrendWindowId(days);
  const trendWindows = TREND_WINDOWS.map((w) => ({ ...w }));
  const measurements = await getBodyCompositionMeasurements(athleteId, days ?? undefined);
  const entries = measurements ?? [];

  if (!entries.length) {
    return emptyBodyPresentationViewModel(activeTrendWindowId, trendWindows);
  }

  return buildPopulatedBodyPresentationViewModel({
    athleteId,
    entries,
    activeTrendWindowId,
    trendWindows,
  });
}
