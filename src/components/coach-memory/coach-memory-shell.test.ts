import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { CoachMemoryShell } from '@/components/coach-memory/coach-memory-shell';

describe('CoachMemoryShell', () => {
  it('renders ink identity and list pulse rows without counters', () => {
    const html = renderToStaticMarkup(createElement(CoachMemoryShell));

    expect(html).toContain('Mémoire du coach');
    expect(html).toContain('contexte coach');
    expect(html).toContain('Déplacements &amp; contraintes');
    expect(html).toContain('surface-ink');
    expect(html.match(/h-16 w-full/g)?.length).toBe(4);
    expect(html).not.toContain('Préférences');
    expect(html).not.toContain('Contraintes datées');
  });
});
