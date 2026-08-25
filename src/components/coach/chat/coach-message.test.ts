import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CoachMessage } from '@/components/coach/chat/coach-message';

describe('CoachMessage', () => {
  it('renders markdown bold instead of raw asterisks', () => {
    const html = renderToStaticMarkup(
      createElement(CoachMessage, null, 'Voici **l’essentiel** pour demain.'),
    );
    expect(html).toContain('<strong');
    expect(html).not.toContain('**');
  });

  it('does not nest bordered metric tiles inside the assistant bubble', () => {
    const html = renderToStaticMarkup(
      createElement(
        CoachMessage,
        null,
        `**B. Vélo**

**Hydratation**
- Apport : 500-750ml par heure`,
      ),
    );

    expect(html).not.toContain('bg-background/40 rounded-analysis border-analysis-border/60');
    expect(html).not.toContain('analysis-panel-alt');
    expect(html).not.toContain('analysis-panel ');
  });
});
