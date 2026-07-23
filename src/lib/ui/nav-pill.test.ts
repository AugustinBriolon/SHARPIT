import { describe, expect, it } from 'vitest';

import { navLinkClass, navPillClass } from './nav-pill';

describe('navPillClass', () => {
  it('keeps Lime highlight for active pills', () => {
    const active = navPillClass(true);
    expect(active).toContain('bg-highlight');
    expect(active).toContain('text-highlight-foreground');
  });

  it('renders inactive pills without a background fill', () => {
    const inactive = navPillClass(false);
    expect(inactive).toContain('bg-transparent');
    expect(inactive).not.toContain('bg-analysis-surface-alt');
    expect(inactive).toContain('hover:bg-highlight/40');
  });
});

describe('navLinkClass', () => {
  it('uses Lime highlight for active state (no primary border-l)', () => {
    const active = navLinkClass(true);
    expect(active).toContain('bg-highlight');
    expect(active).toContain('text-highlight-foreground');
    expect(active).not.toContain('border-l');
    expect(active).not.toContain('border-primary');
  });

  it('uses muted + highlight hover for inactive state', () => {
    const inactive = navLinkClass(false);
    expect(inactive).toContain('text-muted-foreground');
    expect(inactive).toContain('hover:bg-highlight/40');
    expect(inactive).toContain('rounded-analysis');
  });
});
