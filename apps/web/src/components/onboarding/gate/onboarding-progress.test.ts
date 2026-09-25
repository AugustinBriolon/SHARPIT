import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OnboardingProgress } from '@/components/onboarding/gate/onboarding-progress';

describe('OnboardingProgress rail', () => {
  it('fills a fifth of the rail on the first step', () => {
    const html = renderToStaticMarkup(createElement(OnboardingProgress, { step: 'sports' }));
    expect(html).toContain('width:20%');
    expect(html).toContain('1/5');
  });

  it('extends the fill as the athlete advances', () => {
    const html = renderToStaticMarkup(createElement(OnboardingProgress, { step: 'intention' }));
    expect(html).toContain('width:80%');
    expect(html).toContain('4/5');
  });

  it('exposes the step count to assistive tech', () => {
    const html = renderToStaticMarkup(createElement(OnboardingProgress, { step: 'availability' }));
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="3"');
    expect(html).toContain('aria-valuemax="5"');
    expect(html).toContain('Étape 3 sur 5 · Disponibilités');
  });

  it('animates the fill with CSS only (reduced motion is handled globally)', () => {
    const html = renderToStaticMarkup(createElement(OnboardingProgress, { step: 'sports' }));
    expect(html).toContain('transition-[width]');
    expect(html).toContain('duration-300');
  });

  it('draws four ticks so the remaining steps stay countable', () => {
    const html = renderToStaticMarkup(createElement(OnboardingProgress, { step: 'sports' }));
    expect(html).toContain('left:20%');
    expect(html).toContain('left:40%');
    expect(html).toContain('left:60%');
    expect(html).toContain('left:80%');
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
    expect(html).toContain('aria-label="Revenir à Disponibilités"');
    expect(html).toContain('>Disponibilités<');
    expect(html).not.toContain('>Intention<');
  });
});
