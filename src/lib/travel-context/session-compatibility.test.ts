import { describe, expect, it } from 'vitest';
import { findTravelSessionViolation, type TrainingRestriction } from './session-compatibility';

const JOIGNY: TrainingRestriction = {
  label: 'Week-end Joigny',
  locationLabel: 'Joigny',
  startDate: '2026-09-19',
  endDate: '2026-09-20',
  trainingConstraint: 'FULL',
  allowedDisciplines: ['RUN', 'MOBILITY'],
};

describe('findTravelSessionViolation', () => {
  it('blocks a sport outside the declared list and names the allowed sports', () => {
    const reason = findTravelSessionViolation([JOIGNY], {
      date: '2026-09-19',
      type: 'BIKE',
    });

    expect(reason).toContain('Week-end Joigny');
    expect(reason).toContain('Course');
    expect(reason).toContain('Mobilité');
  });

  it('allows a sport that is in the declared list', () => {
    expect(findTravelSessionViolation([JOIGNY], { date: '2026-09-20', type: 'RUN' })).toBeNull();
  });

  it('ignores dates outside the travel window', () => {
    expect(findTravelSessionViolation([JOIGNY], { date: '2026-09-21', type: 'BIKE' })).toBeNull();
  });

  it('does not restrict when no sport list is declared and the constraint is FULL', () => {
    const open: TrainingRestriction = { ...JOIGNY, allowedDisciplines: [] };

    expect(findTravelSessionViolation([open], { date: '2026-09-19', type: 'BIKE' })).toBeNull();
  });

  it('blocks every session when structured training is off', () => {
    const none: TrainingRestriction = {
      ...JOIGNY,
      trainingConstraint: 'NONE',
      allowedDisciplines: [],
    };

    expect(findTravelSessionViolation([none], { date: '2026-09-19', type: 'RUN' })).toContain(
      'aucun entraînement structuré',
    );
  });

  it('reads MOBILITY_ONLY without a sport list as mobility only', () => {
    const mobilityOnly: TrainingRestriction = {
      ...JOIGNY,
      trainingConstraint: 'MOBILITY_ONLY',
      allowedDisciplines: [],
    };

    expect(
      findTravelSessionViolation([mobilityOnly], { date: '2026-09-19', type: 'RUN' }),
    ).not.toBeNull();
  });

  describe('strength sessions when only mobility is allowed', () => {
    it('blocks a session whose exercises are real strength work', () => {
      const reason = findTravelSessionViolation([JOIGNY], {
        date: '2026-09-19',
        type: 'STRENGTH',
        strengthIntents: ['MOBILITY', 'STRENGTH', 'CORE'],
      });

      expect(reason).toContain('seuls ces sports sont autorisés');
    });

    it('allows a session filed as STRENGTH whose exercises are all mobility', () => {
      expect(
        findTravelSessionViolation([JOIGNY], {
          date: '2026-09-19',
          type: 'STRENGTH',
          strengthIntents: ['MOBILITY', 'MOBILITY'],
        }),
      ).toBeNull();
    });

    it('does not block a STRENGTH session that carries no prescription to contradict it', () => {
      expect(
        findTravelSessionViolation([JOIGNY], { date: '2026-09-19', type: 'STRENGTH' }),
      ).toBeNull();
    });

    it('allows real strength work when STRENGTH itself is declared', () => {
      const withStrength: TrainingRestriction = {
        ...JOIGNY,
        allowedDisciplines: ['RUN', 'STRENGTH'],
      };

      expect(
        findTravelSessionViolation([withStrength], {
          date: '2026-09-19',
          type: 'STRENGTH',
          strengthIntents: ['STRENGTH'],
        }),
      ).toBeNull();
    });
  });

  it('reports the first violated window when several overlap the day', () => {
    const runOnly: TrainingRestriction = {
      ...JOIGNY,
      label: 'Contrainte',
      allowedDisciplines: ['RUN'],
    };

    expect(
      findTravelSessionViolation([JOIGNY, runOnly], { date: '2026-09-19', type: 'BIKE' }),
    ).toContain('Week-end Joigny');
  });
});
