import { describe, expect, it } from 'vitest';

import { deriveVerdictHeroDisplay } from '@/components/today/rich/today-verdict-hero-helpers';
import type { TodayViewModel } from '@/core/presentation/today-view-model';

function heroFixture(overrides: Partial<TodayViewModel['hero']> = {}): TodayViewModel['hero'] {
  return {
    eyebrow: 'Qu’est-ce qui compte aujourd’hui ?',
    headline: 'Récupération prioritaire',
    subline: '',
    posture: 'protect',
    postureLabel: 'Récup d’abord',
    focusPriority: 'Allège la séance. Elle sert Half IronMan',
    goalLine: 'Half IronMan · J-30',
    actionLine: 'Allège la séance',
    adaptationReminders: [],
    verdictStyle: {
      showVerdictColors: false,
      bgClass: '',
      colorClass: '',
      dotClass: '',
      accentBarClass: '',
    },
    metricsRow: {
      sleepScore: null,
      recoveryScore: null,
      effortScore: null,
      adaptationScore: null,
      effortUnavailableCaption: null,
      adaptationUnavailableCaption: null,
    },
    signalPreviews: [],
    twinTrustStrip: {
      confidenceLabel: 'Estimation modérée',
      confidencePctRounded: 55,
      confidenceHref: '/recovery',
      limitingCauseText: 'Sommeil fragmenté',
      limitingFactorHref: '/sleep',
    },
    ...overrides,
  };
}

describe('deriveVerdictHeroDisplay', () => {
  it('uses posture alone as contextLabel — never joins the rhetorical eyebrow', () => {
    const display = deriveVerdictHeroDisplay(heroFixture());
    expect(display.contextLabel).toBe('Récup d’abord');
    expect(display.contextLabel).not.toContain('Qu’est-ce qui compte');
  });

  it('falls back to Ce matin when posture is empty', () => {
    const display = deriveVerdictHeroDisplay(heroFixture({ postureLabel: '' }));
    expect(display.contextLabel).toBe('Ce matin');
  });

  it('exposes limiterCause from twinTrustStrip', () => {
    const display = deriveVerdictHeroDisplay(heroFixture());
    expect(display.limiterCause).toBe('Sommeil fragmenté');
  });

  it('returns null limiterCause when limitingCauseText is blank', () => {
    const display = deriveVerdictHeroDisplay(
      heroFixture({
        twinTrustStrip: {
          confidenceLabel: null,
          confidencePctRounded: null,
          confidenceHref: null,
          limitingCauseText: '  ',
          limitingFactorHref: null,
        },
      }),
    );
    expect(display.limiterCause).toBeNull();
  });

  it('prefers focusPriority for the action line', () => {
    const display = deriveVerdictHeroDisplay(heroFixture());
    expect(display.secondaryLine).toBe('Allège la séance. Elle sert Half IronMan');
    expect(display.secondaryMuted).toBe(false);
  });
});
