import { describe, expect, it } from 'vitest';

import { buttonVariants } from '@/components/ui/button';

describe('buttonVariants (Seed ink CTA)', () => {
  it('uses foreground ink for the default filled CTA', () => {
    const classes = buttonVariants({ variant: 'default' });
    expect(classes).toContain('bg-foreground');
    expect(classes).toContain('text-background');
    expect(classes).not.toContain('bg-primary');
  });

  it('keeps accent as chromatic primary for rare emphasis', () => {
    const classes = buttonVariants({ variant: 'accent' });
    expect(classes).toContain('bg-primary');
  });

  it('exposes highlight Lime Pulse variant', () => {
    const classes = buttonVariants({ variant: 'highlight' });
    expect(classes).toContain('bg-highlight');
  });
});
