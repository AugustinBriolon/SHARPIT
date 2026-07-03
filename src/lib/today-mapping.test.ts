import { describe, it, expect } from 'vitest';
import {
  mapVerdictToDisplay,
  mapConfidenceToTier,
  mapRecoveryToSignal,
  mapFatigueTrajectoryToArrow,
  mapFatigueToSignal,
  mapAdaptationToSignal,
  mapAdaptationDecisionToObjective,
  mapDeviationRisk,
  mapConsistencyToDisplay,
  mapConsistencyToAthleteDisplay,
  mapRecoveryProjection,
  mapFatigueProjection,
  mapAdaptationProjection,
  mapRecoveryIntensityLabel,
  mapFatigueCapacityLabel,
  mapScoreToColorClass,
} from './today-mapping';

// ─────────────────────────────────────────────────────────────────────────────
// mapVerdictToDisplay
// ─────────────────────────────────────────────────────────────────────────────

describe('mapVerdictToDisplay', () => {
  it('returns correct label for TRAIN_HARD', () => {
    expect(mapVerdictToDisplay('TRAIN_HARD').label).toBe('Entraîne-toi fort');
  });

  it('returns correct label for RECOVER', () => {
    expect(mapVerdictToDisplay('RECOVER').label).toBe('Récupère');
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

  it('OVERREACHING_RISK → label=Critique', () => {
    expect(mapFatigueToSignal('OVERREACHING_RISK', 'ACCELERATING').label).toBe('Critique');
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
  it('POSITIVELY_ADAPTING → label=Progression, emerald', () => {
    const s = mapAdaptationToSignal('POSITIVELY_ADAPTING', 'IMPROVING');
    expect(s.label).toBe('Progression');
    expect(s.qualityClass).toContain('emerald');
  });

  it('DETRAINING → label=Désentraînement, red', () => {
    const s = mapAdaptationToSignal('DETRAINING', 'DECLINING');
    expect(s.label).toBe('Désentraînement');
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
// mapAdaptationDecisionToObjective
// ─────────────────────────────────────────────────────────────────────────────

describe('mapAdaptationDecisionToObjective', () => {
  it('INCREASE_LOAD → Développer ta condition', () => {
    expect(mapAdaptationDecisionToObjective('INCREASE_LOAD')).toBe('Développer ta condition');
  });

  it('SUSTAIN → Maintenir les acquis', () => {
    expect(mapAdaptationDecisionToObjective('SUSTAIN')).toBe('Maintenir les acquis');
  });

  it('CONSOLIDATE → Consolider les adaptations', () => {
    expect(mapAdaptationDecisionToObjective('CONSOLIDATE')).toBe('Consolider les adaptations');
  });

  it("REDUCE_LOAD → Absorber le stress d'entraînement", () => {
    expect(mapAdaptationDecisionToObjective('REDUCE_LOAD')).toBe(
      "Absorber le stress d'entraînement",
    );
  });

  it('RECOVERY_PRIORITY → Récupération active', () => {
    expect(mapAdaptationDecisionToObjective('RECOVERY_PRIORITY')).toBe('Récupération active');
  });

  it('INSUFFICIENT_DATA → null', () => {
    expect(mapAdaptationDecisionToObjective('INSUFFICIENT_DATA')).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mapDeviationRisk
// ─────────────────────────────────────────────────────────────────────────────

describe('mapDeviationRisk', () => {
  it('LOW risk + stable trajectory → safe', () => {
    const result = mapDeviationRisk('LOW', 'LOW', 'STABLE');
    expect(result.level).toBe('safe');
    expect(result.message).toBe('');
  });

  it('MODERATE risk + accumulating fatigue → caution', () => {
    const result = mapDeviationRisk('MODERATE', 'LOW', 'ACCUMULATING');
    expect(result.level).toBe('caution');
  });

  it('HIGH risk + stable trajectory → caution', () => {
    const result = mapDeviationRisk('HIGH', 'LOW', 'STABLE');
    expect(result.level).toBe('caution');
  });

  it('HIGH risk + accumulating trajectory → warning', () => {
    const result = mapDeviationRisk('HIGH', 'LOW', 'ACCUMULATING');
    expect(result.level).toBe('warning');
  });

  it('CRITICAL risk → warning regardless of trajectory', () => {
    const result = mapDeviationRisk('CRITICAL', 'LOW', 'RESOLVING');
    expect(result.level).toBe('warning');
  });

  it('functional overreaching risk drives result when higher', () => {
    const result = mapDeviationRisk('LOW', 'CRITICAL', 'STABLE');
    expect(result.level).toBe('warning');
  });

  it('warning message is non-empty', () => {
    const result = mapDeviationRisk('CRITICAL', 'CRITICAL', 'ACCELERATING');
    expect(result.message.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mapConsistencyToDisplay
// ─────────────────────────────────────────────────────────────────────────────

describe('mapConsistencyToDisplay', () => {
  it('ALIGNED includes score in label', () => {
    const result = mapConsistencyToDisplay('ALIGNED', 91);
    expect(result.label).toContain('91');
    expect(result.colorClass).toContain('emerald');
  });

  it('PARTIALLY_ALIGNED includes score in label with amber colour', () => {
    const result = mapConsistencyToDisplay('PARTIALLY_ALIGNED', 65);
    expect(result.label).toContain('65');
    expect(result.colorClass).toContain('amber');
  });

  it('CONFLICTING uses orange colour', () => {
    const result = mapConsistencyToDisplay('CONFLICTING', 40);
    expect(result.colorClass).toContain('orange');
  });

  it('mapConsistencyToAthleteDisplay hides raw conflict and shows verdict', () => {
    const result = mapConsistencyToAthleteDisplay('CONFLICTING', 33, 'TRAIN_EASY', 'RECOVERY');
    expect(result.label).toBe('Décision : Entraîne-toi légèrement');
    expect(result.detail).toContain('récupération');
    expect(result.label).not.toContain('conflit');
  });

  it('INSUFFICIENT_DATA returns muted colour and no score', () => {
    const result = mapConsistencyToDisplay('INSUFFICIENT_DATA', 0);
    expect(result.colorClass).toBe('text-muted-foreground');
    expect(result.label).not.toContain('0');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mapRecoveryProjection
// ─────────────────────────────────────────────────────────────────────────────

describe('mapRecoveryProjection', () => {
  it('OVERREACHED → rest message with day count', () => {
    const result = mapRecoveryProjection('OVERREACHED', 'CRITICAL');
    expect(result).toContain('2 à 3 jours');
  });

  it('FATIGUED → active recovery message', () => {
    const result = mapRecoveryProjection('FATIGUED', 'MODERATE');
    expect(result).toContain('accélère');
  });

  it('PARTIALLY_RECOVERED + HIGH risk → manage load message', () => {
    const result = mapRecoveryProjection('PARTIALLY_RECOVERED', 'HIGH');
    expect(result).toContain('maîtrisée');
  });

  it('PARTIALLY_RECOVERED + LOW risk → 24–48h recovery message', () => {
    const result = mapRecoveryProjection('PARTIALLY_RECOVERED', 'LOW');
    expect(result).toContain('24 à 48');
  });

  it('RECOVERED + LOW risk → hold message', () => {
    const result = mapRecoveryProjection('RECOVERED', 'LOW');
    expect(result).toContain('maintenir');
  });

  it('RECOVERED + MODERATE risk → manage intensity message', () => {
    const result = mapRecoveryProjection('RECOVERED', 'MODERATE');
    expect(result).toContain('intensité');
  });

  it('INSUFFICIENT_DATA → empty string', () => {
    expect(mapRecoveryProjection('INSUFFICIENT_DATA', 'LOW')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mapFatigueProjection
// ─────────────────────────────────────────────────────────────────────────────

describe('mapFatigueProjection', () => {
  it('REST_WEEK → rest message', () => {
    const result = mapFatigueProjection('REST_WEEK', 'STABLE', 'FULL');
    expect(result).toContain('dissiper');
  });

  it('TAPER → rest message', () => {
    const result = mapFatigueProjection('TAPER', 'RESOLVING', 'REDUCED');
    expect(result).toContain('dissiper');
  });

  it('REDUCE + ACCELERATING → non-functional overreaching warning', () => {
    const result = mapFatigueProjection('REDUCE', 'ACCELERATING', 'REDUCED');
    expect(result).toContain('surmenage');
  });

  it('REDUCE + ACCUMULATING → compounding message', () => {
    const result = mapFatigueProjection('REDUCE', 'ACCUMULATING', 'REDUCED');
    expect(result).toContain("s'aggrave");
  });

  it('MAINTAIN → functional range message', () => {
    const result = mapFatigueProjection('MAINTAIN', 'STABLE', 'FULL');
    expect(result).toContain('fonctionnelle');
  });

  it('BUILD + RESOLVING → maximises adaptation message', () => {
    const result = mapFatigueProjection('BUILD', 'RESOLVING', 'FULL');
    expect(result).toContain('adaptation');
  });

  it('BUILD + STABLE + FULL → full capacity message', () => {
    const result = mapFatigueProjection('BUILD', 'STABLE', 'FULL');
    expect(result).toContain('pleine');
  });

  it('INSUFFICIENT_DATA → empty string', () => {
    expect(mapFatigueProjection('INSUFFICIENT_DATA', 'STABLE', 'FULL')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mapAdaptationProjection
// ─────────────────────────────────────────────────────────────────────────────

describe('mapAdaptationProjection', () => {
  it('RECOVERY_PRIORITY → protect fitness base message', () => {
    const result = mapAdaptationProjection('RECOVERY_PRIORITY', 1.0);
    expect(result).toContain('forme');
  });

  it('REDUCE_LOAD → adaptations take root message', () => {
    const result = mapAdaptationProjection('REDUCE_LOAD', 0.8);
    expect(result).toContain("s'ancrer");
  });

  it('CONSOLIDATE → consolidates message', () => {
    const result = mapAdaptationProjection('CONSOLIDATE', 1.0);
    expect(result).toContain('consolide');
  });

  it('SUSTAIN → sustains gains message', () => {
    const result = mapAdaptationProjection('SUSTAIN', 1.0);
    expect(result).toContain('maintient');
  });

  it('INCREASE_LOAD + multiplier > 1.1 → 10–14 days message', () => {
    const result = mapAdaptationProjection('INCREASE_LOAD', 1.2);
    expect(result).toContain('10 à 14 jours');
  });

  it('INCREASE_LOAD + multiplier ≤ 1.1 → compound message', () => {
    const result = mapAdaptationProjection('INCREASE_LOAD', 1.05);
    expect(result).toContain('cumulera');
  });

  it('INSUFFICIENT_DATA → empty string', () => {
    expect(mapAdaptationProjection('INSUFFICIENT_DATA', 1.0)).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mapRecoveryIntensityLabel
// ─────────────────────────────────────────────────────────────────────────────

describe('mapRecoveryIntensityLabel', () => {
  it('REST → Repos complet', () => expect(mapRecoveryIntensityLabel('REST')).toBe('Repos complet'));
  it('VERY_EASY → Mouvement très léger', () =>
    expect(mapRecoveryIntensityLabel('VERY_EASY')).toBe('Mouvement très léger'));
  it('EASY → Effort facile', () => expect(mapRecoveryIntensityLabel('EASY')).toBe('Effort facile'));
  it('MODERATE → Effort modéré', () =>
    expect(mapRecoveryIntensityLabel('MODERATE')).toBe('Effort modéré'));
  it('HARD → Haute intensité', () =>
    expect(mapRecoveryIntensityLabel('HARD')).toBe('Haute intensité'));
});

// ─────────────────────────────────────────────────────────────────────────────
// mapFatigueCapacityLabel
// ─────────────────────────────────────────────────────────────────────────────

describe('mapFatigueCapacityLabel', () => {
  it('FULL → Capacité totale', () =>
    expect(mapFatigueCapacityLabel('FULL')).toBe('Capacité totale'));
  it('REDUCED → Capacité réduite', () =>
    expect(mapFatigueCapacityLabel('REDUCED')).toBe('Capacité réduite'));
  it('LIGHT_ONLY → Activité légère uniquement', () =>
    expect(mapFatigueCapacityLabel('LIGHT_ONLY')).toBe('Activité légère uniquement'));
  it('REST_ONLY → Repos uniquement', () =>
    expect(mapFatigueCapacityLabel('REST_ONLY')).toBe('Repos uniquement'));
});

// ─────────────────────────────────────────────────────────────────────────────
// mapScoreToColorClass
// ─────────────────────────────────────────────────────────────────────────────

describe('mapScoreToColorClass', () => {
  it('null → muted', () => expect(mapScoreToColorClass(null)).toBe('text-muted-foreground'));
  it('85 → emerald', () => expect(mapScoreToColorClass(85)).toContain('emerald'));
  it('65 → blue', () => expect(mapScoreToColorClass(65)).toContain('blue'));
  it('45 → amber', () => expect(mapScoreToColorClass(45)).toContain('amber'));
  it('20 → red', () => expect(mapScoreToColorClass(20)).toContain('red'));
  it('80 boundary → emerald', () => expect(mapScoreToColorClass(80)).toContain('emerald'));
  it('60 boundary → blue', () => expect(mapScoreToColorClass(60)).toContain('blue'));
  it('40 boundary → amber', () => expect(mapScoreToColorClass(40)).toContain('amber'));
});
