import { describe, expect, it } from 'vitest';
import {
  mergeWithingsMeasureGroups,
  parseWithingsMeasureGroup,
  enrichMeasurementsWithHeartEcg,
  WITHINGS_MEASURE,
} from '@/lib/integrations/withings-measures';

describe('parseWithingsMeasureGroup', () => {
  it('parse Body Scan metrics including vascular age and nerve health', () => {
    const parsed = parseWithingsMeasureGroup({
      grpid: 42,
      date: 1_728_000_000,
      measures: [
        { type: WITHINGS_MEASURE.WEIGHT, value: 7550, unit: -2 },
        { type: WITHINGS_MEASURE.FAT_RATIO, value: 185, unit: -1 },
        { type: WITHINGS_MEASURE.VASCULAR_AGE, value: 42, unit: 0 },
        { type: WITHINGS_MEASURE.NERVE_HEALTH_FEET_MAX, value: 85, unit: 0 },
        { type: WITHINGS_MEASURE.SKIN_CONDUCTANCE, value: 72, unit: 0 },
        { type: WITHINGS_MEASURE.PULSE_WAVE_VELOCITY, value: 65, unit: -1 },
        { type: WITHINGS_MEASURE.BMR, value: 1850, unit: 0 },
      ],
    });

    expect(parsed.weightKg).toBe(75.5);
    expect(parsed.bodyFatPct).toBe(18.5);
    expect(parsed.vascularAgeYears).toBe(42);
    expect(parsed.nerveHealthScore).toBe(85);
    expect(parsed.skinConductance).toBe(72);
    expect(parsed.pulseWaveVelocity).toBe(6.5);
    expect(parsed.bmr).toBe(1850);
  });

  it('merges measure groups from the same Body Scan session', () => {
    const merged = mergeWithingsMeasureGroups([
      {
        grpid: 1,
        date: 1_728_000_000,
        category: 1,
        measures: [
          { type: WITHINGS_MEASURE.WEIGHT, value: 8205, unit: -2 },
          { type: WITHINGS_MEASURE.FAT_RATIO, value: 1066, unit: -2 },
        ],
      },
      {
        grpid: 2,
        date: 1_728_000_030,
        category: 1,
        measures: [
          { type: WITHINGS_MEASURE.VASCULAR_AGE, value: 38, unit: 0 },
          { type: WITHINGS_MEASURE.NERVE_HEALTH_FEET_MAX, value: 85, unit: 0 },
        ],
      },
    ]);

    expect(merged).toHaveLength(1);
    const parsed = parseWithingsMeasureGroup(merged[0]!);
    expect(parsed.weightKg).toBe(82.05);
    expect(parsed.vascularAgeYears).toBe(38);
    expect(parsed.nerveHealthScore).toBe(85);
  });

  it('utilise fm pour la classification FA quand présent', () => {
    const parsed = parseWithingsMeasureGroup({
      grpid: 99,
      date: 1_728_000_000,
      measures: [{ type: WITHINGS_MEASURE.AFIB_ECG, value: 9, unit: 0, fm: 4 }],
    });
    expect(parsed.withingsExtras?.ecg?.['130']).toBe(4);
  });

  it('enrichit avec Heart v2 la classification affichée dans l app', () => {
    const base = parseWithingsMeasureGroup({
      grpid: 1,
      date: 1_728_000_000,
      measures: [
        { type: WITHINGS_MEASURE.WEIGHT, value: 8000, unit: -2 },
        { type: WITHINGS_MEASURE.AFIB_ECG, value: 9, unit: 0 },
      ],
    });
    const [enriched] = enrichMeasurementsWithHeartEcg(base ? [base] : [], [
      { timestamp: 1_728_000_000, ecg: { signalid: 1, afib: 0 }, heart_rate: 62 },
    ]);
    expect(enriched?.withingsExtras?.ecgAfibClassification).toBe(0);
    expect(enriched?.withingsExtras?.ecg?.['130']).toBe(0);
  });
});
