import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CorpsHubSkeleton } from '@/components/corps/corps-hub-skeleton';
import { isPresentationValuesLoading } from '@/hooks/use-presentation-view-model';
import { physicalHealthLoadingShell } from '@/lib/presentation/physical-health-loading-shell';

describe('biology hub loading gate', () => {
  it('treats cold start and placeholder as values-loading', () => {
    expect(isPresentationValuesLoading({ isPending: true, isPlaceholderData: false })).toBe(true);
    expect(isPresentationValuesLoading({ isPending: false, isPlaceholderData: true })).toBe(true);
  });

  it('does not flash on background refetch of the same key', () => {
    expect(isPresentationValuesLoading({ isPending: false, isPlaceholderData: false })).toBe(false);
  });

  it('provides stable suivi chrome without inventing conditions', () => {
    const shell = physicalHealthLoadingShell();
    expect(shell.activeConditions).toEqual([]);
    expect(shell.medicalDisclaimer.length).toBeGreaterThan(0);
    expect(shell.emptyState).toBeNull();
  });
});

describe('CorpsHubSkeleton', () => {
  it('renders Mon corps header, Composition tab active, and value pulses', () => {
    const html = renderToStaticMarkup(createElement(CorpsHubSkeleton));

    expect(html).toContain('Mon corps');
    expect(html).toContain('Forme &amp; bien-être');
    expect(html).toContain('Poids, masse grasse');
    expect(html).toContain('Composition');
    expect(html).toContain('Suivi physique');
    expect(html).toContain('!bg-highlight');
    expect(html).toContain('surface-ink');
    expect(html).toContain('Dernière pesée');
    expect(html).toContain('Signaux de composition');
  });
});
