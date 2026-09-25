import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';

import { TrainingListFallback } from '@/components/training/hub/training-list';

describe('TrainingListFallback', () => {
  it('renders preview-shaped skeletons without a 2-col grid', () => {
    const html = renderToStaticMarkup(createElement(TrainingListFallback));
    expect(html).toContain('analysis-panel');
    expect(html).not.toContain('sm:grid-cols-2');
  });
});
