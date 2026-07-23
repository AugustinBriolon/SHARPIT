import type {
  BodyMetricCardVm,
  BodyMetricExplainerVm,
  BodyTrendWindowId,
  BodyViewModel,
} from '@/core/presentation/body-view-model';
import { athleteCompositionContext } from '@/lib/profile/athlete-profile-utils';
import {
  buildCompositionSeries,
  computeCompositionTrend,
  dedupeBodyCompositionByDay,
  formatCompositionDelta,
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
import { parseWithingsEcgStats } from '@/lib/integrations/withings-ecg-display';

const TREND_WINDOWS = [
  { id: '14d', label: '14 j', days: 14 },
  { id: '30d', label: '30 j', days: 30 },
  { id: '90d', label: '90 j', days: 90 },
  { id: '1y', label: '1 an', days: 365 },
  { id: 'all', label: 'Tout', days: null },
] as const satisfies ReadonlyArray<{ id: BodyTrendWindowId; label: string; days: number | null }>;

const AGE_COMPARED_METRICS: CompositionMetricId[] = ['vascularAgeYears', 'metabolicAge', 'bmi'];

function heightFromWithingsExtras(extras: unknown): number | null {
  if (extras == null || typeof extras !== 'object') return null;
  const maybe = extras as Record<string, unknown>;
  const h = maybe.heightM;
  return typeof h === 'number' && h > 0 ? h : null;
}

function sourceLabel(source: string | null | undefined): string | null {
  if (source == null) return null;
  if (source === 'WITHINGS') return 'Withings';
  return 'Renpho';
}

function inferActiveTrendWindowId(days: number | null | undefined): BodyTrendWindowId {
  if (days == null) return 'all';
  if (days === 14) return '14d';
  if (days === 30) return '30d';
  if (days === 90) return '90d';
  if (days === 365) return '1y';
  return 'all';
}

function displayMeasuredAt(date: Date | null | undefined): string | null {
  if (!date) return null;
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
    AGE_COMPARED_METRICS.includes(args.metricId) && args.context.chronologicalAgeYears == null;
  const showAgeComparisonNote =
    AGE_COMPARED_METRICS.includes(args.metricId) && args.context.chronologicalAgeYears != null;

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

export async function buildBodyPresentationViewModel(days?: number | null): Promise<BodyViewModel> {
  const activeTrendWindowId = inferActiveTrendWindowId(days);
  const trendWindows = TREND_WINDOWS.map((w) => ({ ...w }));

  const measurements = await getBodyCompositionMeasurements(days ?? undefined);
  const entries = measurements ?? [];

  if (!entries.length) {
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
        heroMini: {
          bodyFatPct: {
            value: null,
            deltaDisplay: null,
            deltaTone: 'ok',
            deltaHint: null,
            tone: 'neutral',
          },
          musclePct: {
            value: null,
            deltaDisplay: null,
            deltaTone: 'ok',
            deltaHint: null,
            tone: 'neutral',
          },
          visceralFat: {
            value: null,
            deltaDisplay: null,
            deltaTone: 'ok',
            deltaHint: null,
            tone: 'neutral',
          },
          waterPct: {
            value: null,
            deltaDisplay: null,
            deltaTone: 'ok',
            deltaHint: null,
            tone: 'neutral',
          },
        },
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

  const latest = entries[0]!;

  // Build interpretive context for the metric guides (server-side).
  const profile = await getAthleteProfile();
  const baseCtx = athleteCompositionContext(profile);
  const heightM = baseCtx.heightM ?? heightFromWithingsExtras(latest.withingsExtras);

  const compositionContext: CompositionContext = {
    heightM,
    weightKg: latest.weightKg ?? null,
    chronologicalAgeYears: baseCtx.chronoAge,
  };

  const entriesDedup = dedupeBodyCompositionByDay(entries);

  const weight = computeCompositionTrend(entriesDedup, 'weightKg');
  const bodyFat = computeCompositionTrend(entriesDedup, 'bodyFatPct');
  const muscle = computeCompositionTrend(entriesDedup, 'musclePct');
  const visceral = computeCompositionTrend(entriesDedup, 'visceralFat');
  const water = computeCompositionTrend(entriesDedup, 'waterPct');
  const bmi = computeCompositionTrend(entriesDedup, 'bmi');

  const latestBmiDisplay = latest.bmi ?? bmi.latest ?? null;

  const chartData = buildCompositionSeries(entriesDedup);

  const weightDelta = buildWeeklyDeltaPresentation('weightKg', weight.delta, (delta) =>
    formatCompositionDelta(delta, ' kg'),
  );

  function buildMetricDeltaFooter(
    metricId: 'bmi' | 'bodyFatPct' | 'musclePct' | 'visceralFat',
    delta7d: number | null | undefined,
  ) {
    const presentation = buildWeeklyDeltaPresentation(metricId, delta7d, (delta) =>
      formatCompositionDelta(delta, ' pts vs 7j'),
    );
    if (presentation.deltaDisplay == null) return null;
    return {
      footer: presentation.deltaDisplay,
      footerTone: presentation.deltaTone,
      footerHint: presentation.deltaHint,
    };
  }

  const hero: BodyViewModel['hero'] = {
    latestWeightKg: latest.weightKg ?? null,
    latestWeightDisplay: latest.weightKg != null ? `${latest.weightKg}` : '—',
    measuredAtLabel: displayMeasuredAt(latest.measuredAt),
    sourceLabel: sourceLabel(latest.source),
    weightDeltaDisplay: weightDelta.deltaDisplay,
    weightDeltaTone: weight.delta != null ? weightDelta.deltaTone : null,
    weightDeltaHint: weightDelta.deltaHint,
    heroMini: {
      bodyFatPct: (() => {
        const delta = buildWeeklyDeltaPresentation('bodyFatPct', bodyFat.delta, (d) =>
          formatCompositionDelta(d, ' pts'),
        );
        const zoneTone =
          bodyFat.latest != null
            ? getGuide('bodyFatPct').interpret(bodyFat.latest, compositionContext).tone
            : 'neutral';
        return {
          value: bodyFat.latest,
          deltaDisplay: delta.deltaDisplay,
          deltaTone: delta.deltaTone,
          deltaHint: delta.deltaHint,
          tone:
            bodyFat.latest != null
              ? resolveMetricValueTone(zoneTone, 'bodyFatPct', bodyFat.delta)
              : 'neutral',
          guideId: 'bodyFatPct' as CompositionMetricId,
        };
      })(),
      musclePct: (() => {
        const delta = buildWeeklyDeltaPresentation('musclePct', muscle.delta, (d) =>
          formatCompositionDelta(d, ' pts'),
        );
        const zoneTone =
          muscle.latest != null
            ? getGuide('musclePct').interpret(muscle.latest, compositionContext).tone
            : 'neutral';
        return {
          value: muscle.latest,
          deltaDisplay: delta.deltaDisplay,
          deltaTone: delta.deltaTone,
          deltaHint: delta.deltaHint,
          tone:
            muscle.latest != null
              ? resolveMetricValueTone(zoneTone, 'musclePct', muscle.delta)
              : 'neutral',
          guideId: 'musclePct' as CompositionMetricId,
        };
      })(),
      visceralFat: (() => {
        const delta = buildWeeklyDeltaPresentation('visceralFat', visceral.delta, (d) =>
          formatCompositionDelta(d, ' pts'),
        );
        const zoneTone =
          visceral.latest != null
            ? getGuide('visceralFat').interpret(visceral.latest, compositionContext).tone
            : 'neutral';
        return {
          value: visceral.latest,
          deltaDisplay: delta.deltaDisplay,
          deltaTone: delta.deltaTone,
          deltaHint: delta.deltaHint,
          tone:
            visceral.latest != null
              ? resolveMetricValueTone(zoneTone, 'visceralFat', visceral.delta)
              : 'neutral',
          guideId: 'visceralFat' as CompositionMetricId,
        };
      })(),
      waterPct: (() => {
        // No weekly-delta severity threshold exists for water % (unlike the other
        // three metrics) — show the raw 7-day delta as display text only, tone
        // stays the guide's static zone interpretation (same as the old context card).
        const zoneTone =
          water.latest != null
            ? getGuide('waterPct').interpret(water.latest, compositionContext).tone
            : 'neutral';
        return {
          value: water.latest,
          deltaDisplay:
            water.delta != null ? (formatCompositionDelta(water.delta, ' pts') ?? null) : null,
          deltaTone: 'ok' as const,
          deltaHint: null,
          tone: zoneTone,
          guideId: 'waterPct' as CompositionMetricId,
        };
      })(),
    },
  };

  // Build insights (Product Insight Layer already exists).
  const insights = buildBodyPageInsights({
    bodyFatDelta7d: bodyFat.delta,
    latestWeightKg: weight.latest,
    measuredAtLabel: hero.measuredAtLabel,
    sourceLabel: hero.sourceLabel,
    visceralFat: visceral.latest,
    waterPercent: latest.waterPct ?? null,
    weightDelta7d: weight.delta,
  });

  // Metric explainer map for any metric card that includes “expliquer”.
  const explainerByMetricId: BodyViewModel['explainerByMetricId'] = {};

  function ensureExplainer(
    metricId: CompositionMetricId,
    raw: number | null | undefined,
    display: string | null | undefined,
  ) {
    if (raw == null || display == null) return;
    if (explainerByMetricId[metricId]) return;
    explainerByMetricId[metricId] = buildExplainerVm({
      metricId,
      rawValue: raw,
      displayValue: display,
      context: compositionContext,
    });
  }

  const trajectoryCards: BodyMetricCardVm[] = [];
  if (latestBmiDisplay != null) {
    const metricId: CompositionMetricId = 'bmi';
    const valueDisplay = `${latestBmiDisplay}`;
    const guide = getGuide(metricId);
    const interpretation = guide.interpret(latestBmiDisplay, compositionContext);
    ensureExplainer(metricId, latestBmiDisplay, valueDisplay);
    const bmiDeltaFooter = buildMetricDeltaFooter('bmi', bmi.delta);
    trajectoryCards.push({
      cardId: metricId,
      guideId: metricId,
      label: 'IMC',
      valueDisplay,
      footer: bmiDeltaFooter?.footer ?? 'Repère poids / taille²',
      footerTone: bmiDeltaFooter?.footerTone,
      footerHint: bmiDeltaFooter?.footerHint ?? undefined,
      tone: resolveMetricValueTone(interpretation.tone, metricId, bmi.delta),
    });
  }

  // bodyFatPct/musclePct/visceralFat are already shown in hero.heroMini above —
  // ensureExplainer keeps the explainer modal available for them without a
  // second, duplicate trajectoryCards tile.
  if (bodyFat.latest != null) {
    const metricId: CompositionMetricId = 'bodyFatPct';
    ensureExplainer(metricId, bodyFat.latest, `${bodyFat.latest} %`);
  }

  if (muscle.latest != null) {
    const metricId: CompositionMetricId = 'musclePct';
    ensureExplainer(metricId, muscle.latest, `${muscle.latest} %`);
  }

  if (visceral.latest != null) {
    const metricId: CompositionMetricId = 'visceralFat';
    ensureExplainer(metricId, visceral.latest, `${visceral.latest}`);
  }

  if (latest.fatFreeWeightKg != null) {
    trajectoryCards.push({
      cardId: 'fatFreeWeightKg',
      label: 'Masse maigre',
      valueDisplay: `${latest.fatFreeWeightKg.toFixed(1)} kg`,
      tone: 'neutral',
    });
  }

  if (latest.boneKg != null) {
    trajectoryCards.push({
      cardId: 'boneKg',
      label: 'Masse osseuse',
      valueDisplay: `${latest.boneKg.toFixed(2)} kg`,
      tone: 'neutral',
    });
  }

  // waterPct is now shown in hero.heroMini above — ensureExplainer keeps the
  // explainer modal available without a second, duplicate contextCards tile.
  if (latest.waterPct != null) {
    const metricId: CompositionMetricId = 'waterPct';
    ensureExplainer(metricId, latest.waterPct, `${latest.waterPct.toFixed(1)} %`);
  }

  const contextCards: BodyMetricCardVm[] = [];
  if (latest.bmr != null) {
    const metricId: CompositionMetricId = 'bmr';
    const valueDisplay = `${Math.round(latest.bmr)} kcal`;
    const interpretation = getGuide(metricId).interpret(latest.bmr, compositionContext);
    ensureExplainer(metricId, latest.bmr, valueDisplay);
    contextCards.push({
      cardId: metricId,
      guideId: metricId,
      label: 'Métabolisme basal',
      valueDisplay,
      tone: interpretation.tone,
    });
  }
  if (latest.metabolicAge != null) {
    const metricId: CompositionMetricId = 'metabolicAge';
    const valueDisplay = `${latest.metabolicAge} ans`;
    const interpretation = getGuide(metricId).interpret(latest.metabolicAge, compositionContext);
    ensureExplainer(metricId, latest.metabolicAge, valueDisplay);
    contextCards.push({
      cardId: metricId,
      guideId: metricId,
      label: 'Âge métabolique',
      valueDisplay,
      tone: interpretation.tone,
    });
  }

  const healthScanCards: BodyMetricCardVm[] = [];
  const ecgStats = parseWithingsEcgStats(latest.withingsExtras);

  if (latest.vascularAgeYears != null) {
    const metricId: CompositionMetricId = 'vascularAgeYears';
    const valueDisplay = `${latest.vascularAgeYears} ans`;
    const interpretation = getGuide(metricId).interpret(
      latest.vascularAgeYears,
      compositionContext,
    );
    ensureExplainer(metricId, latest.vascularAgeYears, valueDisplay);
    healthScanCards.push({
      cardId: metricId,
      guideId: metricId,
      label: 'Âge vasculaire',
      valueDisplay,
      tone: interpretation.tone,
    });
  }
  if (latest.pulseWaveVelocity != null) {
    const metricId: CompositionMetricId = 'pulseWaveVelocity';
    const valueDisplay = `${latest.pulseWaveVelocity.toFixed(1)} m/s`;
    const interpretation = getGuide(metricId).interpret(
      latest.pulseWaveVelocity,
      compositionContext,
    );
    ensureExplainer(metricId, latest.pulseWaveVelocity, valueDisplay);
    healthScanCards.push({
      cardId: metricId,
      guideId: metricId,
      label: 'Onde de pouls (PWV)',
      valueDisplay,
      tone: interpretation.tone,
    });
  }
  if (latest.nerveHealthScore != null) {
    const metricId: CompositionMetricId = 'nerveHealthScore';
    const valueDisplay = `${Math.round(latest.nerveHealthScore)}`;
    const interpretation = getGuide(metricId).interpret(
      latest.nerveHealthScore,
      compositionContext,
    );
    ensureExplainer(metricId, latest.nerveHealthScore, valueDisplay);
    healthScanCards.push({
      cardId: metricId,
      guideId: metricId,
      label: 'Santé nerveuse',
      valueDisplay,
      tone: interpretation.tone,
    });
  }
  if (latest.nerveResponseScore != null) {
    const metricId: CompositionMetricId = 'nerveResponseScore';
    const valueDisplay = `${Math.round(latest.nerveResponseScore)}`;
    const interpretation = getGuide(metricId).interpret(
      latest.nerveResponseScore,
      compositionContext,
    );
    ensureExplainer(metricId, latest.nerveResponseScore, valueDisplay);
    healthScanCards.push({
      cardId: metricId,
      guideId: metricId,
      label: 'Réponse nerveuse',
      valueDisplay,
      tone: interpretation.tone,
    });
  }
  if (latest.skinConductance != null) {
    const metricId: CompositionMetricId = 'skinConductance';
    const valueDisplay = `${latest.skinConductance.toFixed(0)}`;
    const interpretation = getGuide(metricId).interpret(latest.skinConductance, compositionContext);
    ensureExplainer(metricId, latest.skinConductance, valueDisplay);
    healthScanCards.push({
      cardId: metricId,
      guideId: metricId,
      label: 'Conductance (ESC)',
      valueDisplay,
      tone: interpretation.tone,
    });
  }
  if (latest.vo2Max != null) {
    const metricId: CompositionMetricId = 'vo2Max';
    const valueDisplay = `${latest.vo2Max.toFixed(1)} ml/kg/min`;
    const interpretation = getGuide(metricId).interpret(latest.vo2Max, compositionContext);
    ensureExplainer(metricId, latest.vo2Max, valueDisplay);
    healthScanCards.push({
      cardId: metricId,
      guideId: metricId,
      label: 'VO₂ max est.',
      valueDisplay,
      tone: interpretation.tone,
    });
  }
  if (latest.heartRate != null) {
    const metricId: CompositionMetricId = 'heartRate';
    const valueDisplay = `${latest.heartRate} bpm`;
    const interpretation = getGuide(metricId).interpret(latest.heartRate, compositionContext);
    ensureExplainer(metricId, latest.heartRate, valueDisplay);
    healthScanCards.push({
      cardId: metricId,
      guideId: metricId,
      label: 'FC debout',
      valueDisplay,
      tone: interpretation.tone,
    });
  }

  for (const stat of ecgStats) {
    const metricId = stat.guideId as CompositionMetricId;
    ensureExplainer(metricId, stat.value, stat.displayValue);
    const { tone } = getGuide(metricId).interpret(stat.value, compositionContext);
    healthScanCards.push({
      cardId: metricId,
      guideId: metricId,
      label: stat.label,
      valueDisplay: stat.displayValue,
      tone,
    });
  }

  const hasBodyScan = Boolean(
    latest.vascularAgeYears != null ||
    latest.nerveHealthScore != null ||
    latest.pulseWaveVelocity != null ||
    latest.skinConductance != null ||
    latest.vo2Max != null ||
    ecgStats.length > 0,
  );

  return {
    hasData: true,
    emptyState: null,
    trendWindows,
    activeTrendWindowId,
    insights,
    hero,
    context: { chronologicalAgeYears: compositionContext.chronologicalAgeYears },
    hasBodyScan,
    trajectoryCards,
    contextCards,
    healthScanCards,
    chartData,
    explainerByMetricId,
    hierarchy: { rootId: 'body', order: ['hero', 'insights', 'sections', 'trends'] },
  };
}
