import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BOOTSTRAP_LINES,
  BOOTSTRAP_SUPPORT,
  OnboardingBootstrapScreen,
} from '@/components/onboarding/gate/onboarding-bootstrap-screen';

describe('OnboardingBootstrapScreen copy', () => {
  it('marks the post-Finaliser beat as completion, not mid-wizard setup', () => {
    expect(BOOTSTRAP_LINES[0]).toMatch(/terminé/i);
    expect(BOOTSTRAP_SUPPORT).toMatch(/finalisé/i);
    expect(BOOTSTRAP_LINES.join(' ')).not.toMatch(/Création de ton profil/);
  });

  it('renders the first completion line and support copy', () => {
    const html = renderToStaticMarkup(
      createElement(OnboardingBootstrapScreen, { onDone: () => undefined }),
    );
    expect(html).toContain(BOOTSTRAP_LINES[0]);
    expect(html).toContain(BOOTSTRAP_SUPPORT);
  });
});
