import { describe, it, expect } from 'vitest';
import {
  mapVerdictToDisplay,
  mapConfidenceToTier,
  mapRecoveryToSignal,
  mapFatigueTrajectoryToArrow,
  mapFatigueToSignal,
  mapAdaptationToSignal,
  extractPrimaryInsight,
} from './today-mapping';

// ─────────────────────────────────────────────────────────────────────────────
// mapVerdictToDisplay
// ─────────────────────────────────────────────────────────────────────────────

describe('mapVerdictToDisplay', () => {
  it('returns correct label for TRAIN_HARD', () => {
    expect(mapVerdictToDisplay('TRAIN_HARD').label).toBe('Train Hard');
  });

  it('returns correct label for RECOVER', () => {
    expect(mapVerdictToDisplay('RECOVER').label).toBe('Recover');
  });

  it('TRAIN_HARD and RACE_READY share emerald colour', () => {
    const h = mapVerdictToDisplay('TRAIN_HARD');
    const r = mapVerdictToDisplay('RACE_READY');
    expect(h.colorClass).toBe(r.colorClass);
  });

  it('INSUFFICIENT_DATA uses muted colours', () => {
    const d = mapVerdictToDisplay('INSUFFICIENT_DATA');
    expect(d.colorClass).toContain('muted');
  });

  it('returns a display for every verdict variant', () => {
    const verdicts = [
      'TRAIN_HARD',
      'TRAIN_SMART',
      'TRAIN_EASY',
      'RECOVER',
      'RACE_READY',
      'CAUTION',
      'INSUFFICIENT_DATA',
    ] as const;
    for (const v of verdicts) {
      expect(mapVerdictToDisplay(v).label).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mapConfidenceToTier
// ─────────────────────────────────────────────────────────────────────────────

describe('mapConfidenceToTier', () => {
  it('returns high for 0.7', () => expect(mapConfidenceToTier(0.7)).toBe('high'));
  it('returns high for 1.0', () => expect(mapConfidenceToTier(1.0)).toBe('high'));
  it('returns medium for 0.4', () => expect(mapConfidenceToTier(0.4)).toBe('medium'));
  it('returns medium for 0.69', () => expect(mapConfidenceToTier(0.69)).toBe('medium'));
  it('returns low for 0.39', () => expect(mapConfidenceToTier(0.39)).toBe('low'));
  it('returns low for 0.0', () => expect(mapConfidenceToTier(0.0)).toBe('low'));
});

// ─────────────────────────────────────────────────────────────────────────────
// mapRecoveryToSignal
// ─────────────────────────────────────────────────────────────────────────────

describe('mapRecoveryToSignal', () => {
  it('OPTIMAL → isAvailable=true, arrowDirection=up', () => {
    const s = mapRecoveryToSignal('OPTIMAL');
    expect(s.isAvailable).toBe(true);
    expect(s.arrowDirection).toBe('up');
  });

  it('ADEQUATE → neutral arrow', () => {
    expect(mapRecoveryToSignal('ADEQUATE').arrowDirection).toBe('neutral');
  });

  it('VERY_LOW → arrowDirection=down', () => {
    expect(mapRecoveryToSignal('VERY_LOW').arrowDirection).toBe('down');
  });

  it('BASELINE_PENDING → isAvailable=false', () => {
    expect(mapRecoveryToSignal('BASELINE_PENDING').isAvailable).toBe(false);
  });

  it('INSUFFICIENT_DATA → isAvailable=false', () => {
    expect(mapRecoveryToSignal('INSUFFICIENT_DATA').isAvailable).toBe(false);
  });

  it('returns a signal for every ReadinessCategory', () => {
    const categories = [
      'OPTIMAL',
      'ADEQUATE',
      'REDUCED',
      'LOW',
      'VERY_LOW',
      'BASELINE_PENDING',
      'INSUFFICIENT_DATA',
    ] as const;
    for (const c of categories) {
      expect(mapRecoveryToSignal(c).label).toBeTruthy();
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mapFatigueTrajectoryToArrow
// ─────────────────────────────────────────────────────────────────────────────

describe('mapFatigueTrajectoryToArrow', () => {
  it('RESOLVING → direction=down', () => {
    expect(mapFatigueTrajectoryToArrow('RESOLVING').direction).toBe('down');
  });

  it('STABLE → direction=neutral', () => {
    expect(mapFatigueTrajectoryToArrow('STABLE').direction).toBe('neutral');
  });

  it('ACCUMULATING → direction=up', () => {
    expect(mapFatigueTrajectoryToArrow('ACCUMULATING').direction).toBe('up');
  });

  it('ACCELERATING → direction=up, double arrow', () => {
    const r = mapFatigueTrajectoryToArrow('ACCELERATING');
    expect(r.direction).toBe('up');
    expect(r.arrow).toBe('↑↑');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mapFatigueToSignal
// ─────────────────────────────────────────────────────────────────────────────

describe('mapFatigueToSignal', () => {
  it('FRESH → isAvailable=true, emerald colour', () => {
    const s = mapFatigueToSignal('FRESH', 'STABLE');
    expect(s.isAvailable).toBe(true);
    expect(s.qualityClass).toContain('emerald');
  });

  it('OVERREACHING_RISK → label=Critical', () => {
    expect(mapFatigueToSignal('OVERREACHING_RISK', 'ACCELERATING').label).toBe('Critical');
  });

  it('INSUFFICIENT_DATA → isAvailable=false regardless of trajectory', () => {
    expect(mapFatigueToSignal('INSUFFICIENT_DATA', 'STABLE').isAvailable).toBe(false);
  });

  it('trajectory arrow propagates into signal', () => {
    const s = mapFatigueToSignal('FRESH', 'ACCUMULATING');
    expect(s.arrowDirection).toBe('up');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mapAdaptationToSignal
// ─────────────────────────────────────────────────────────────────────────────

describe('mapAdaptationToSignal', () => {
  it('POSITIVELY_ADAPTING → label=Growing, emerald', () => {
    const s = mapAdaptationToSignal('POSITIVELY_ADAPTING', 'IMPROVING');
    expect(s.label).toBe('Growing');
    expect(s.qualityClass).toContain('emerald');
  });

  it('DETRAINING → label=Detraining, red', () => {
    const s = mapAdaptationToSignal('DETRAINING', 'DECLINING');
    expect(s.label).toBe('Detraining');
    expect(s.qualityClass).toContain('red');
  });

  it('INSUFFICIENT_DATA → isAvailable=false', () => {
    expect(mapAdaptationToSignal('INSUFFICIENT_DATA', 'STABLE').isAvailable).toBe(false);
  });

  it('trend arrow propagates into signal', () => {
    const s = mapAdaptationToSignal('MAINTAINING', 'DECLINING');
    expect(s.arrowDirection).toBe('down');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// extractPrimaryInsight
// ─────────────────────────────────────────────────────────────────────────────

describe('extractPrimaryInsight', () => {
  it('returns topAction rationale first', () => {
    expect(extractPrimaryInsight('rationale', 'finding', 'explanation')).toBe('rationale');
  });

  it('falls back to firstFindingTitle when rationale is null', () => {
    expect(extractPrimaryInsight(null, 'finding title', 'explanation')).toBe('finding title');
  });

  it('falls back to first sentence of explanation when both null', () => {
    expect(extractPrimaryInsight(null, null, 'First sentence. Second sentence.')).toBe(
      'First sentence',
    );
  });

  it('returns null when all inputs are null', () => {
    expect(extractPrimaryInsight(null, null, null)).toBeNull();
  });

  it('handles empty rationale string by falling through', () => {
    expect(extractPrimaryInsight('', 'finding', 'explanation')).toBe('finding');
  });

  it('trims whitespace from extracted sentence', () => {
    const result = extractPrimaryInsight(null, null, '  Trimmed sentence.  rest');
    expect(result).toBe('Trimmed sentence');
  });
});
