import { describe, expect, it } from 'vitest';

import { navLinkClass } from './nav-pill';

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
