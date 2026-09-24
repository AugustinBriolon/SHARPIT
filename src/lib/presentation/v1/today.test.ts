import { ActivityType } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { projectV1Today, type V1TodaySource } from './today';

const origin = 'https://app.example';

function source(
  over: Partial<V1TodaySource> & { hero?: Partial<V1TodaySource['hero']> } = {},
): V1TodaySource {
  const { hero: heroOver, ...rest } = over;
  return {
    hasContent: true,
    emptyState: null,
    hero: {
      eyebrow: 'Ce matin',
      headline: 'Séance prévue',
      subline: 'Tenir',
      posture: 'steady',
      postureLabel: 'FEU VERT',
      focusPriority: 'Entraîne-toi — légèrement',
      actionLine: null,
      twinTrustStrip: {
        confidencePctRounded: 72,
        limitingCauseText: 'Sommeil',
        confidenceLabel: 'ESTIMATION PARTIELLE',
      },
      reliability: {
        packTier: 'PARTIAL',
        visibleGaps: ['Baseline HRV partielle (moins de 14 j)'],
      },
      signalPreviews: [
        { key: 'sleep', scoreDisplay: '78', subtitle: 'Correct' },
        { key: 'recovery', scoreDisplay: '61', subtitle: null },
        { key: 'effort', scoreDisplay: '—', subtitle: null },
        { key: 'adaptation', scoreDisplay: '55', subtitle: null },
      ],
      ...heroOver,
    },
    header: { weather: { city: 'Lyon', tempC: 12, condition: 'Nuageux' } },
    actionRow: {
      daySummaryLines: [
        {
          id: 's1',
          kind: 'planned',
          primary: 'Seuil 40 min',
          secondary: 'Course',
          activityType: ActivityType.RUN,
          metrics: [{ label: 'Durée', value: '40', unit: 'min' }],
        },
      ],
    },
    ...rest,
  };
}

describe('projectV1Today', () => {
  it('projects a full hero without href or Tailwind classes', () => {
    const json = projectV1Today(source(), { trainingDayId: '2026-09-15', webOrigin: origin });
    expect(json.apiVersion).toBe(1);
    expect(json.trainingDayId).toBe('2026-09-15');
    expect(json.empty).toBeNull();
    expect(json.verdict).toEqual({
      eyebrow: 'Ce matin',
      headline: 'Séance prévue',
      subline: 'Tenir',
      posture: 'steady',
      confidencePct: 72,
      limitingCause: 'Sommeil',
      statusLabel: 'FEU VERT',
      actionLine: 'Entraîne-toi — légèrement',
      confidenceLabel: 'ESTIMATION PARTIELLE',
      packTier: 'PARTIAL',
      estimationGaps: ['Baseline HRV partielle (moins de 14 j)'],
    });
    expect(json.weather).toEqual({ city: 'Lyon', tempC: 12, condition: 'Nuageux' });
    expect(json.sessions).toEqual([
      {
        id: 's1',
        kind: 'planned',
        title: 'Seuil 40 min',
        subtitle: 'Course',
        metrics: [{ label: 'Durée', value: '40', unit: 'min' }],
        sport: 'Course',
        priority: true,
        plannedSessionId: null,
      },
    ]);
    expect(json.signals.map((s) => s.key)).toEqual(['sleep', 'recovery']);
    expect(JSON.stringify(json)).not.toMatch(/href|bgClass|rounded-/);
  });

  it('offers the Garmin handoff when the day is empty and Garmin is not connected', () => {
    const json = projectV1Today(
      source({
        hasContent: false,
        emptyState: {
          title: 'Données insuffisantes',
          description: 'SHARPIT attend tes premières données.',
          action: { label: 'Ouvrir', href: '/moi' },
        },
      }),
      { trainingDayId: '2026-09-15', webOrigin: `${origin}/`, garminConnected: false },
    );
    expect(json.empty).toEqual({
      title: 'Pas encore de données',
      message:
        'Connecte Garmin pour que ton Twin lise ton sommeil, ta récupération et tes séances.',
      code: 'NO_CONTENT',
      webURL: 'https://app.example/connect/garmin',
      actionLabel: 'Connecter Garmin',
    });
    expect(json.verdict.headline).toBe('Pas encore de données');
  });

  it('keeps the Twin’s own message and drops the action once Garmin is connected', () => {
    const json = projectV1Today(
      source({
        hasContent: false,
        emptyState: { title: 'Données insuffisantes', description: 'SHARPIT attend tes données.' },
      }),
      { trainingDayId: '2026-09-15', webOrigin: origin, garminConnected: true },
    );
    expect(json.empty).toEqual({
      title: 'Données insuffisantes',
      message: 'SHARPIT attend tes données.',
      code: 'NO_CONTENT',
      webURL: 'https://app.example/connect/garmin',
      actionLabel: null,
    });
  });

  it('drops weather and sessions when absent', () => {
    const json = projectV1Today(
      source({ header: { weather: null }, actionRow: { daySummaryLines: [] } }),
      { trainingDayId: '2026-09-15', webOrigin: origin },
    );
    expect(json.weather).toBeNull();
    expect(json.sessions).toEqual([]);
  });
});
