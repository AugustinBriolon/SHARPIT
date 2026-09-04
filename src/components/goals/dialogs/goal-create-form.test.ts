import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ActivityType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { PerformanceMetricGoalForm } from '@/components/goals/dialogs/metric-goal-performance-form';

describe('PerformanceMetricGoalForm compact (onboarding)', () => {
  it('hides end mode, title and notes', () => {
    const html = renderToStaticMarkup(
      createElement(PerformanceMetricGoalForm, {
        allowedSports: [ActivityType.RUN],
        chronoTarget: '',
        compact: true,
        customDistanceKm: '',
        customTitle: '',
        distancePreset: '5k',
        formId: 'test-form',
        performanceEndDate: '',
        performanceEndMode: 'on_achieved',
        sport: ActivityType.RUN,
        suggestedPerformanceTitle: '5 km en 25:00',
        uid: 'uid-test',
        onChronoTargetChange: () => {},
        onCustomDistanceKmChange: () => {},
        onCustomTitleChange: () => {},
        onDistancePresetChange: () => {},
        onPerformanceEndDateChange: () => {},
        onPerformanceEndModeChange: () => {},
        onSportChange: () => {},
        onSubmit: () => {},
      }),
    );

    expect(html).toContain('Temps cible');
    expect(html).not.toContain('Fin de l');
    expect(html).not.toContain('>Titre<');
    expect(html).not.toContain('>Notes<');
  });
});
