import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OnboardingProgress } from '@/components/onboarding/onboarding-progress';

describe('OnboardingProgress rail', () => {
  it('fills a quarter of the rail on the first step', () => {
    const html = renderToStaticMarkup(createElement(OnboardingProgress, { step: 'sports' }));
    expect(html).toContain('width:25%');
    expect(html).toContain('1/4');
  });

  it('extends the fill as the athlete advances', () => {
    const html = renderToStaticMarkup(createElement(OnboardingProgress, { step: 'intention' }));
    expect(html).toContain('width:75%');
    expect(html).toContain('3/4');
  });

  it('exposes the step count to assistive tech', () => {
    const html = renderToStaticMarkup(createElement(OnboardingProgress, { step: 'equipment' }));
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="2"');
    expect(html).toContain('aria-valuemax="4"');
    expect(html).toContain('Étape 2 sur 4 · Équipement');
  });

  it('animates the fill with CSS only (reduced motion is handled globally)', () => {
    const html = renderToStaticMarkup(createElement(OnboardingProgress, { step: 'sports' }));
    expect(html).toContain('transition-[width]');
    expect(html).toContain('duration-300');
  });

  it('draws three ticks so the remaining steps stay countable', () => {
    const html = renderToStaticMarkup(createElement(OnboardingProgress, { step: 'sports' }));
    expect(html).toContain('left:25%');
    expect(html).toContain('left:50%');
    expect(html).toContain('left:75%');
  });
});

describe('OnboardingProgress back affordance', () => {
  it('shows the current step name on the first page, without a back control', () => {
    const html = renderToStaticMarkup(createElement(OnboardingProgress, { step: 'sports' }));
    expect(html).toContain('>Sports<');
    expect(html).not.toContain('Revenir à');
  });

  it('labels the back control with the previous step name', () => {
    const html = renderToStaticMarkup(
      createElement(OnboardingProgress, { step: 'intention', onBack: () => undefined }),
    );
    expect(html).toContain('aria-label="Revenir à Équipement"');
    expect(html).toContain('>Équipement<');
    expect(html).not.toContain('>Intention<');
  });
});
