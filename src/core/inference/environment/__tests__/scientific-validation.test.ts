/**
 * SCIENTIFIC VALIDATION SUITE — Environmental Context Engine (Phase 2.5 + 2.6)
 *
 * Validates physiological plausibility, neutral zone, and calibrated impact curves.
 * Does NOT modify environment-v1.1 public API or pipeline structure.
 */

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { getEnvironmentalStressor } from '@/core/environment';
import { ENVIRONMENTAL_VALIDATION_SCENARIOS, MONOTONIC_COMPARISON_GROUPS } from '../scenarios';
import {
  applyEnvironmentalImpactToAdaptationIndex,
  applyEnvironmentalImpactToFatigueIndex,
  applyEnvironmentalImpactToReadiness,
} from '../apply-impact';
import {
  applyEnvironmentalSensitivityProfile,
  createNeutralEnvironmentalSensitivityProfile,
} from '../sensitivity-profile';
import { ENVIRONMENTAL_NEUTRAL_ZONE } from '@/core/environment/calibration';
import {
  assertMonotonicIncreasing,
  buildScenarioOutput,
  compositeIntensity,
  isImpactSignificant,
  readImpactMultiplier,
  stressorIntensity,
} from '../validation-helpers';

function isImpactNeutral(impact: ReturnType<typeof buildScenarioOutput>['impact']): boolean {
  const recovery = readImpactMultiplier(impact, 'recovery');
  const fatigue = readImpactMultiplier(impact, 'fatigue');
  const performance = readImpactMultiplier(impact, 'performance');
  const hydration = readImpactMultiplier(impact, 'hydration');
  return recovery === 1 && fatigue === 1 && performance === 1 && hydration === 1;
}

function scenarioById(id: string) {
  const scenario = ENVIRONMENTAL_VALIDATION_SCENARIOS.find((s) => s.id === id);
  if (!scenario) throw new Error(`Unknown scenario: ${id}`);
  return scenario;
}

function runScenario(id: string) {
  const scenario = scenarioById(id);
  return {
    scenario,
    output: buildScenarioOutput({
      weather: scenario.weather,
      applicability: scenario.applicability,
    }),
  };
}

function assertRange(value: number | null, min?: number, max?: number) {
  if (value === null) {
    expect(min).toBeUndefined();
    return;
  }
  if (min != null) expect(value).toBeGreaterThanOrEqual(min);
  if (max != null) expect(value).toBeLessThanOrEqual(max);
}

describe('environment scientific validation — scenario catalog', () => {
  it.each(ENVIRONMENTAL_VALIDATION_SCENARIOS.map((s) => [s.id, s.label] as const))(
    '%s (%s) produces coherent stress and impact',
    (id) => {
      const { scenario, output } = runScenario(id);
      const { stress, impact } = output;
      const expected = scenario.expectedBehavior;

      if (expected.suppressed) {
        expect(stress.suppressionReason).not.toBeNull();
        expect(compositeIntensity(stress)).toBeNull();
        expect(readImpactMultiplier(impact, 'recovery')).toBeNull();
        return;
      }

      assertRange(
        stressorIntensity(stress, 'THERMAL'),
        expected.thermalIntensityMin,
        expected.thermalIntensityMax,
      );
      assertRange(
        stressorIntensity(stress, 'WIND'),
        expected.windIntensityMin,
        expected.windIntensityMax,
      );
      assertRange(
        stressorIntensity(stress, 'HYDRATION'),
        expected.hydrationIntensityMin,
        expected.hydrationIntensityMax,
      );
      assertRange(
        readImpactMultiplier(impact, 'recovery'),
        expected.recoveryDemandMin,
        expected.recoveryDemandMax,
      );
      assertRange(
        readImpactMultiplier(impact, 'fatigue'),
        expected.fatigueAccumulationMin,
        expected.fatigueAccumulationMax,
      );
      assertRange(
        readImpactMultiplier(impact, 'performance'),
        expected.performanceRatioMin,
        expected.performanceRatioMax,
      );
      assertRange(
        compositeIntensity(stress),
        expected.compositeIntensityMin,
        expected.compositeIntensityMax,
      );

      if (expected.impactNeutral === true) {
        expect(isImpactNeutral(impact)).toBe(true);
        expect(isImpactSignificant(impact)).toBe(false);
      }

      if (expected.significanceExpected != null) {
        expect(isImpactSignificant(impact)).toBe(expected.significanceExpected);
      }

      const thermal = stressorIntensity(stress, 'THERMAL');
      const recoveryDemand = readImpactMultiplier(impact, 'recovery');
      if (thermal != null && thermal >= 0.85 && recoveryDemand != null) {
        expect(recoveryDemand).toBeGreaterThanOrEqual(1.1);
      }
    },
  );
});

describe('environment scientific validation — Phase 2.6 calibration', () => {
  it('neutral zone scenarios have composite below ceiling but identity impact', () => {
    for (const id of ['COOL_WEATHER', 'MILD_BASELINE', 'ALTITUDE_STUB'] as const) {
      const { stress, impact } = runScenario(id).output;
      const composite = compositeIntensity(stress);
      expect(composite).not.toBeNull();
      if (composite != null) {
        expect(composite).toBeLessThan(ENVIRONMENTAL_NEUTRAL_ZONE.compositeCeiling);
      }
      expect(isImpactNeutral(impact)).toBe(true);
    }
  });

  it('stress exists in neutral zone without modifying downstream multipliers', () => {
    const { stress, impact } = runScenario('MILD_BASELINE').output;
    expect(stressorIntensity(stress, 'THERMAL')).toBeGreaterThan(0);
    expect(isImpactNeutral(impact)).toBe(true);
  });

  it('impact magnitude grows progressively cool → mild → hot → extreme', () => {
    const demands = MONOTONIC_COMPARISON_GROUPS.thermalSeverity.map((id) =>
      readImpactMultiplier(runScenario(id).output.impact, 'recovery'),
    );
    expect(assertMonotonicIncreasing(demands)).toBe(true);
    expect(demands[0]).toBe(1);
    expect(demands[1]).toBe(1);
    expect(demands[3]).toBeGreaterThan(demands[2]!);
  });

  it('combined stressors remain stronger than isolated hot weather', () => {
    const hot = runScenario('HOT_WEATHER').output;
    const combined = runScenario('COMBINED_STRESSORS').output;
    expect(readImpactMultiplier(combined.impact, 'recovery')).toBeGreaterThan(
      readImpactMultiplier(hot.impact, 'recovery')!,
    );
    expect(readImpactMultiplier(combined.impact, 'fatigue')).toBeGreaterThan(
      readImpactMultiplier(hot.impact, 'fatigue')!,
    );
  });

  it('indoor activities remain fully suppressed regardless of outdoor weather severity', () => {
    const { stress, impact } = runScenario('INDOOR_TRAINER').output;
    expect(stress.suppressionReason).not.toBeNull();
    expect(readImpactMultiplier(impact, 'recovery')).toBeNull();
    expect(isImpactSignificant(impact)).toBe(false);
  });
});

describe('environment scientific validation — monotonicity', () => {
  it('thermal severity increases monotonically across cool → mild → hot → extreme', () => {
    const intensities = MONOTONIC_COMPARISON_GROUPS.thermalSeverity.map((id) =>
      stressorIntensity(runScenario(id).output.stress, 'THERMAL'),
    );
    expect(assertMonotonicIncreasing(intensities)).toBe(true);
  });

  it('recovery demand increases monotonically with thermal severity', () => {
    const demands = MONOTONIC_COMPARISON_GROUPS.thermalSeverity.map((id) =>
      readImpactMultiplier(runScenario(id).output.impact, 'recovery'),
    );
    expect(assertMonotonicIncreasing(demands)).toBe(true);
  });

  it('wind exposure increases monotonically mild → strong wind', () => {
    const wind = MONOTONIC_COMPARISON_GROUPS.windSeverity.map((id) =>
      stressorIntensity(runScenario(id).output.stress, 'WIND'),
    );
    expect(assertMonotonicIncreasing(wind)).toBe(true);
  });

  it('combined stressors exceed hot-only composite intensity', () => {
    const hot = compositeIntensity(runScenario('HOT_WEATHER').output.stress);
    const combined = compositeIntensity(runScenario('COMBINED_STRESSORS').output.stress);
    expect(hot).not.toBeNull();
    expect(combined).not.toBeNull();
    if (hot != null && combined != null) {
      expect(combined).toBeGreaterThan(hot);
    }
  });

  it('humid heat produces hydration demand at least equal to dry hot', () => {
    const dryHot = stressorIntensity(runScenario('HOT_WEATHER').output.stress, 'HYDRATION');
    const humid = stressorIntensity(runScenario('HIGH_HUMIDITY').output.stress, 'HYDRATION');
    expect(dryHot).not.toBeNull();
    expect(humid).not.toBeNull();
    if (dryHot != null && humid != null) {
      expect(humid).toBeGreaterThanOrEqual(dryHot);
    }
  });

  it('humid heat recovery demand exceeds dry hot recovery demand', () => {
    const dryHot = readImpactMultiplier(runScenario('HOT_WEATHER').output.impact, 'recovery');
    const humid = readImpactMultiplier(runScenario('HIGH_HUMIDITY').output.impact, 'recovery');
    expect(dryHot).not.toBeNull();
    expect(humid).not.toBeNull();
    if (dryHot != null && humid != null) {
      expect(humid).toBeGreaterThan(dryHot);
    }
  });
});

describe('environment scientific validation — stress propagation', () => {
  it('maps stress to impact without exposing weather fields on EnvironmentalImpact', () => {
    const { impact } = runScenario('HOT_WEATHER').output;
    const keys = Object.keys(impact);
    expect(keys).not.toContain('thermalStress');
    expect(keys).not.toContain('windExposure');
    expect(keys).toContain('recovery');
    expect(keys).toContain('fatigue');
    expect(keys).toContain('performance');
  });

  it('altitude stressor remains unavailable without fabricated altitude impact', () => {
    const { stress, impact } = runScenario('ALTITUDE_STUB').output;
    const altitude = getEnvironmentalStressor(stress, 'ALTITUDE');
    expect(altitude?.intensity.available).toBe(false);
    expect(readImpactMultiplier(impact, 'recovery')).not.toBeNull();
  });

  it('indoor suppression zeroes composite and neutralizes impact multipliers', () => {
    const { stress, impact } = runScenario('INDOOR_TRAINER').output;
    expect(stress.suppressionReason).not.toBeNull();
    expect(compositeIntensity(stress)).toBeNull();
    expect(readImpactMultiplier(impact, 'recovery')).toBeNull();
    expect(isImpactSignificant(impact)).toBe(false);
  });
});

describe('environment scientific validation — downstream overlay behavior', () => {
  it('hot weather reduces readiness overlay monotonically vs cool', () => {
    const coolImpact = runScenario('COOL_WEATHER').output.impact;
    const hotImpact = runScenario('HOT_WEATHER').output.impact;
    const base = 80;
    const coolAdjusted = applyEnvironmentalImpactToReadiness(base, coolImpact);
    const hotAdjusted = applyEnvironmentalImpactToReadiness(base, hotImpact);
    expect(coolAdjusted).not.toBeNull();
    expect(hotAdjusted).not.toBeNull();
    if (coolAdjusted != null && hotAdjusted != null) {
      expect(hotAdjusted).toBeLessThanOrEqual(coolAdjusted);
    }
  });

  it('hot weather increases fatigue overlay vs mild baseline', () => {
    const mildImpact = runScenario('MILD_BASELINE').output.impact;
    const hotImpact = runScenario('HOT_WEATHER').output.impact;
    const base = 50;
    const mildAdjusted = applyEnvironmentalImpactToFatigueIndex(base, mildImpact) ?? base;
    const hotAdjusted = applyEnvironmentalImpactToFatigueIndex(base, hotImpact) ?? base;
    expect(hotAdjusted).toBeGreaterThanOrEqual(mildAdjusted);
  });

  it('combined stressors reduce adaptation performance overlay more than hot alone', () => {
    const hotImpact = runScenario('HOT_WEATHER').output.impact;
    const combinedImpact = runScenario('COMBINED_STRESSORS').output.impact;
    const base = 70;
    const hotAdjusted = applyEnvironmentalImpactToAdaptationIndex(base, hotImpact) ?? base;
    const combinedAdjusted =
      applyEnvironmentalImpactToAdaptationIndex(base, combinedImpact) ?? base;
    expect(combinedAdjusted).toBeLessThanOrEqual(hotAdjusted);
  });
});

describe('environment scientific validation — boundary isolation', () => {
  const DOWNSTREAM_PATHS = [
    'src/core/inference/recovery/model.ts',
    'src/core/inference/fatigue/model.ts',
    'src/core/inference/adaptation/model.ts',
    'src/core/inference/reasoning/model.ts',
  ];

  it('downstream models do not import raw environmental observations', () => {
    for (const relativePath of DOWNSTREAM_PATHS) {
      const source = readFileSync(resolve(process.cwd(), relativePath), 'utf8');
      expect(source).not.toMatch(/EnvironmentalObservation/);
      expect(source).not.toMatch(/EnvironmentalContext/);
      expect(source).not.toMatch(/buildEnvironmentalStress/);
    }
  });

  it('inference layer does not modify environment-v1.1 public exports', async () => {
    const envIndex = readFileSync(resolve(process.cwd(), 'src/core/environment/index.ts'), 'utf8');
    expect(envIndex).toMatch(/environment-v1\.1/);
    expect(envIndex).not.toMatch(/sensitivity-profile/);
  });
});

describe('environment scientific validation — sensitivity profile integration point', () => {
  it('neutral profile is a passthrough (personalization not yet active)', () => {
    const { impact } = runScenario('HOT_WEATHER').output;
    const profile = createNeutralEnvironmentalSensitivityProfile('athlete-1');
    expect(profile.isDefault).toBe(true);
    expect(profile.thermal.multiplier).toBe(1);

    const personalized = applyEnvironmentalSensitivityProfile({
      baseImpact: impact,
      profile,
    });
    expect(personalized).toEqual(impact);
  });
});

describe('environment scientific validation — stressor collection integrity', () => {
  it('every outdoor scenario exposes all known stressor slots', () => {
    const { stress } = runScenario('MILD_BASELINE').output;
    expect(stress.stressors.length).toBe(5);
    for (const stressor of stress.stressors) {
      expect(stressor).toHaveProperty('intensity');
      expect(stressor).toHaveProperty('confidence');
      expect(stressor).toHaveProperty('supportingObservations');
      expect(stressor).toHaveProperty('explanation');
    }
  });
});
