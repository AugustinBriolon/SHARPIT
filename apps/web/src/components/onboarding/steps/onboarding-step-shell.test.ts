import { createElement, type ComponentProps } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { OnboardingStepProgressProvider } from '@/components/onboarding/steps/onboarding-step-progress-context';
import { OnboardingStepShell } from '@/components/onboarding/steps/onboarding-step-shell';

/** Props without required `children` — React 19 createElement takes children as arg 3. */
type PropsWithoutChildren<T extends { children?: unknown }> = Omit<T, 'children'>;

describe('OnboardingStepShell sticky progress', () => {
  it('sticks the progress rail as a direct section child (not nested with the title)', () => {
    const providerProps = {
      step: 'intention',
      onBack: () => undefined,
      backDisabled: false,
    } satisfies PropsWithoutChildren<ComponentProps<typeof OnboardingStepProgressProvider>>;

    const shellProps = {
      intro: 'Intro',
      title: 'Pourquoi SharpIt ?',
      titleId: 'onboarding-intention-title',
    } satisfies PropsWithoutChildren<ComponentProps<typeof OnboardingStepShell>>;

    const html = renderToStaticMarkup(
      createElement(
        OnboardingStepProgressProvider,
        providerProps as ComponentProps<typeof OnboardingStepProgressProvider>,
        createElement(
          OnboardingStepShell,
          shellProps as ComponentProps<typeof OnboardingStepShell>,
          createElement('p', null, 'content'),
        ),
      ),
    );

    expect(html).toContain('sticky top-0');
    expect(html).toContain('pt-3');
    // Sticky must be a section child — nesting it with the title clamps sticky
    // to that short box and it unsticks as soon as the intro scrolls away.
    expect(html).toMatch(
      /<section[^>]*>\s*<div class="[^"]*sticky top-0[\s\S]*?<\/div>\s*<header class="space-y-1 mt-4">/,
    );
    expect(html).toContain('>Disponibilités<');
    expect(html).toContain('4/5');
  });
});
