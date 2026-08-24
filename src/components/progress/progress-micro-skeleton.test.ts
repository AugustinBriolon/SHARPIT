import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { ProgressHubSkeleton } from '@/components/progress/progress-hub-skeleton';
import { isPresentationValuesLoading } from '@/hooks/use-presentation-view-model';
import { physicalHealthLoadingShell } from '@/lib/presentation/physical-health-loading-shell';

describe('progress hub loading gate', () => {
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

describe('ProgressHubSkeleton', () => {
  it('renders Progression chrome with Objectifs, Performance and Corps & santé', () => {
    const html = renderToStaticMarkup(createElement(ProgressHubSkeleton));

    expect(html).toContain('Progression');
    expect(html).toContain('Objectifs');
    expect(html).toContain('Performance');
    expect(html).toContain('Corps &amp; santé');
    expect(html).not.toContain('!bg-highlight');
  });
});
