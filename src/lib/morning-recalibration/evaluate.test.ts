import { describe, expect, it } from 'vitest';
import { evaluateMorningSessionRecalibration } from '@/lib/morning-recalibration/evaluate';

const baseSession = {
  id: 'ps-1',
  type: 'RUN' as const,
  intensity: 'THRESHOLD' as const,
  durationMin: 60,
  load: 80,
  title: 'Seuil',
  description: null as string | null,
  completed: false,
  activityId: null,
};

const strengthDescription =
  'Travail en salle : 1. Mobilité bassin/sciatique. 2. Exercices lestés modérés. 3. Travail postural (pied en canard) via des fentes contrôlées.';

describe('evaluateMorningSessionRecalibration', () => {
  it('stays silent without wellness', () => {
    expect(
      evaluateMorningSessionRecalibration({
        wellnessCompleted: false,
        session: baseSession,
        decision: { overallVerdict: 'RECOVER', confidenceTier: 'HIGH' },
      }),
    ).toBeNull();
  });

  it('downgrades high intensity on RECOVER', () => {
    const proposal = evaluateMorningSessionRecalibration({
      wellnessCompleted: true,
      session: baseSession,
      decision: { overallVerdict: 'RECOVER', confidenceTier: 'HIGH' },
    });
    expect(proposal?.direction).toBe('DOWN');
    expect(proposal?.toIntensity).toBe('ENDURANCE');
    expect(proposal?.toLoad).toBe(48);
    expect(proposal?.changeSummary).toContain('Endurance');
  });

  it('upgrades recovery session on TRAIN_HARD', () => {
    const proposal = evaluateMorningSessionRecalibration({
      wellnessCompleted: true,
      session: { ...baseSession, intensity: 'RECOVERY', load: 20 },
      decision: { overallVerdict: 'TRAIN_HARD', confidenceTier: 'HIGH' },
    });
    expect(proposal?.direction).toBe('UP');
    expect(proposal?.toIntensity).toBe('ENDURANCE');
  });

  it('stays silent when already aligned', () => {
    expect(
      evaluateMorningSessionRecalibration({
        wellnessCompleted: true,
        session: { ...baseSession, intensity: 'ENDURANCE', load: 50 },
        decision: { overallVerdict: 'TRAIN_SMART', confidenceTier: 'MEDIUM' },
      }),
    ).toBeNull();
  });

  it('ignores completed sessions', () => {
    expect(
      evaluateMorningSessionRecalibration({
        wellnessCompleted: true,
        session: { ...baseSession, completed: true },
        decision: { overallVerdict: 'RECOVER', confidenceTier: 'HIGH' },
      }),
    ).toBeNull();
  });

  it('stays silent on insufficient confidence', () => {
    expect(
      evaluateMorningSessionRecalibration({
        wellnessCompleted: true,
        session: baseSession,
        decision: { overallVerdict: 'RECOVER', confidenceTier: 'INSUFFICIENT' },
      }),
    ).toBeNull();
  });

  it('forces recovery on REST_ONLY capacity', () => {
    const proposal = evaluateMorningSessionRecalibration({
      wellnessCompleted: true,
      session: baseSession,
      decision: {
        overallVerdict: 'TRAIN_SMART',
        confidenceTier: 'HIGH',
        fatigueTrainingCapacity: 'REST_ONLY',
      },
    });
    expect(proposal?.direction).toBe('DOWN');
    expect(proposal?.toIntensity).toBe('RECOVERY');
    expect(proposal?.toDurationMin).toBe(30);
    expect(proposal?.toLoad).toBe(25);
  });

  it('soft-upgrades recovery on TRAIN_SMART with HIGH confidence', () => {
    const proposal = evaluateMorningSessionRecalibration({
      wellnessCompleted: true,
      session: { ...baseSession, intensity: 'RECOVERY', load: 20 },
      decision: { overallVerdict: 'TRAIN_SMART', confidenceTier: 'HIGH' },
    });
    expect(proposal?.direction).toBe('UP');
    expect(proposal?.toIntensity).toBe('ENDURANCE');
  });

  it('upgrades STRENGTH with strength wording and adapted structure', () => {
    const proposal = evaluateMorningSessionRecalibration({
      wellnessCompleted: true,
      session: {
        ...baseSession,
        type: 'STRENGTH',
        intensity: 'ENDURANCE',
        title: 'Force & Mobilité',
        load: 25,
        description: strengthDescription,
      },
      decision: { overallVerdict: 'TRAIN_HARD', confidenceTier: 'HIGH' },
    });
    expect(proposal?.direction).toBe('UP');
    expect(proposal?.toIntensity).toBe('TEMPO');
    expect(proposal?.changeSummary).toContain('Léger');
    expect(proposal?.changeSummary).toContain('Modéré');
    expect(proposal?.why).not.toMatch(/tempo/i);
    expect(proposal?.toDescription).toContain('progression légère');
    expect(proposal?.fromDescription).toBe(strengthDescription);
  });

  it('eases STRENGTH on RECOVER by removing loaded work from structure', () => {
    const proposal = evaluateMorningSessionRecalibration({
      wellnessCompleted: true,
      session: {
        ...baseSession,
        type: 'STRENGTH',
        intensity: 'ENDURANCE',
        title: 'Force & Mobilité',
        load: 25,
        description: strengthDescription,
      },
      decision: { overallVerdict: 'RECOVER', confidenceTier: 'HIGH' },
    });
    expect(proposal?.direction).toBe('DOWN');
    expect(proposal?.toIntensity).toBe('RECOVERY');
    expect(proposal?.changeSummary).toContain('déroulé adapté');
    expect(proposal?.toDescription).toMatch(/sans charge lourde|légers \/ au poids du corps/i);
    expect(proposal?.toDescription).not.toMatch(/Exercices lestés modérés/);
    expect(proposal?.why).toMatch(/lesté|mobilité/i);
  });

  it('upgrades ENDURANCE run to TEMPO on TRAIN_HARD', () => {
    const proposal = evaluateMorningSessionRecalibration({
      wellnessCompleted: true,
      session: { ...baseSession, intensity: 'ENDURANCE', load: 25 },
      decision: { overallVerdict: 'TRAIN_HARD', confidenceTier: 'HIGH' },
    });
    expect(proposal?.direction).toBe('UP');
    expect(proposal?.toIntensity).toBe('TEMPO');
    expect(proposal?.why).toContain('tempo');
    expect(proposal?.toDescription).toBeNull();
  });
});
