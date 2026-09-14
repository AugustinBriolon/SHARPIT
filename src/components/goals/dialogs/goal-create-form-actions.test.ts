import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { GoalCreateFormActions } from '@/components/goals/dialogs/goal-create-form-parts';

describe('GoalCreateFormActions docked (onboarding)', () => {
  it('emits the shared Passer / Continuer chrome without a nested action row', () => {
    const html = renderToStaticMarkup(
      createElement(GoalCreateFormActions, {
        form: 'goal-form',
        fullWidthOnMobile: true,
        skipLabel: 'Passer',
        submitLabel: 'Continuer',
        submitReady: true,
        onSkip: () => undefined,
      }),
    );

    expect(html).toContain('Passer');
    expect(html).toContain('Continuer');
    expect(html).toContain('w-full sm:w-auto');
    expect(html).toContain('sm:mr-auto');
    expect(html).toContain('form="goal-form"');
    expect(html).toContain('type="submit"');
    // Docked bar owns the flex — no duplicate wrapper that would swallow px-6.
    expect(html).not.toContain('sm:justify-end');
  });
});
