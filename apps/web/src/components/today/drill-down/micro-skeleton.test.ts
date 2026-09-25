import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { DrillDownDimensionRow } from '@/components/today/drill-down/dimension-row';
import { SkeletonDataValue } from '@/components/ui/skeleton-data-value';
import { isPresentationValuesLoading } from '@/hooks/use-presentation-view-model';

describe('isPresentationValuesLoading', () => {
  it('is true on cold pending', () => {
    expect(isPresentationValuesLoading({ isPending: true, isPlaceholderData: false })).toBe(true);
  });

  it('is true on date-change placeholder', () => {
    expect(isPresentationValuesLoading({ isPending: false, isPlaceholderData: true })).toBe(true);
  });

  it('is false when settled on real data', () => {
    expect(isPresentationValuesLoading({ isPending: false, isPlaceholderData: false })).toBe(false);
  });
});

describe('SkeletonDataValue', () => {
  it('renders a pulse placeholder', () => {
    const html = renderToStaticMarkup(createElement(SkeletonDataValue, {}));
    expect(html).toContain('animate-pulse');
  });
});

describe('DrillDownDimensionRow loading', () => {
  it('keeps label and hides numeric score while loading', () => {
    const html = renderToStaticMarkup(
      createElement(DrillDownDimensionRow, {
        label: 'Progression de charge',
        description: 'La charge évolue-t-elle de façon productive ?',
        dim: { score: 29, status: 'OK', available: true },
        loading: true,
      }),
    );
    expect(html).toContain('Progression de charge');
    expect(html).toContain('La charge évolue-t-elle');
    expect(html).not.toContain('>29<');
    expect(html).toContain('animate-pulse');
  });
});
