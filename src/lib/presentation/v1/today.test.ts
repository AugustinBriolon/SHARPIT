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
      twinTrustStrip: { confidencePctRounded: 72, limitingCauseText: 'Sommeil court' },
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
      limitingCause: 'Sommeil court',
    });
    expect(json.weather).toEqual({ city: 'Lyon', tempC: 12, condition: 'Nuageux' });
    expect(json.sessions).toEqual([
      {
        id: 's1',
        kind: 'planned',
        title: 'Seuil 40 min',
        subtitle: 'Course',
        metrics: [{ label: 'Durée', value: '40', unit: 'min' }],
      },
    ]);
    expect(json.signals).toHaveLength(4);
    expect(JSON.stringify(json)).not.toMatch(/href|bgClass|rounded-/);
  });

  it('sets empty NO_CONTENT and absolute webURL', () => {
    const json = projectV1Today(
      source({
        hasContent: false,
        emptyState: {
          title: 'Pas encore de données',
          description: 'Connecte Garmin sur le web',
          action: { label: 'Ouvrir', href: '/moi' },
        },
      }),
      { trainingDayId: '2026-09-15', webOrigin: origin },
    );
    expect(json.empty).toEqual({
      title: 'Pas encore de données',
      message: 'Connecte Garmin sur le web',
      code: 'NO_CONTENT',
      webURL: 'https://app.example/moi',
    });
    expect(json.verdict.headline).toBe('Pas encore de données');
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
