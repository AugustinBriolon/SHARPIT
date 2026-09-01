import { describe, expect, it } from 'vitest';

import { BRAND } from '@/lib/brand/brand-tokens';
import { authAppearance, clerkAppearance } from '@/lib/theme/clerk-appearance';

describe('clerkAppearance theme bridge', () => {
  it('binds color tokens to semantic CSS variables (light/dark flip)', () => {
    const { variables } = clerkAppearance;

    expect(variables.colorPrimary).toBe('var(--primary)');
    expect(variables.colorPrimaryForeground).toBe('var(--primary-foreground)');
    expect(variables.colorBackground).toBe('var(--card)');
    expect(variables.colorForeground).toBe('var(--card-foreground)');
    expect(variables.colorMutedForeground).toBe('var(--muted-foreground)');
    expect(variables.colorInput).toBe('var(--background)');
    expect(variables.colorBorder).toBe('var(--border)');
    expect(variables.colorDanger).toBe('var(--destructive)');
    expect(variables.borderRadius).toBe(BRAND.radius);
  });

  it('does not hard-code Forest Depths as Clerk primary (illegible on dark)', () => {
    const values = Object.values(clerkAppearance.variables);
    expect(values).not.toContain(BRAND.forestDepths);
    expect(values.some((v) => typeof v === 'string' && /^#[0-9a-fA-F]{3,8}$/.test(v))).toBe(
      false,
    );
  });

  it('keeps auth chrome branding in AuthShell (hides Clerk header/logo)', () => {
    expect(authAppearance.elements.headerTitle).toBe('hidden');
    expect(authAppearance.elements.headerSubtitle).toBe('hidden');
    expect(authAppearance.elements.logoBox).toBe('hidden');
  });

  it('uses full border tokens on cards and social buttons for dark contrast', () => {
    expect(clerkAppearance.elements.cardBox).toContain('border-border');
    expect(clerkAppearance.elements.cardBox).not.toContain('border-border/80');
    expect(clerkAppearance.elements.socialButtonsBlockButton).toContain('dark:border-foreground/30');
    expect(clerkAppearance.elements.formFieldInput).toContain('placeholder:text-muted-foreground');
    expect(clerkAppearance.elements.formFieldErrorText).toBe('text-destructive!');
    expect(clerkAppearance.elements.formButtonPrimary).toContain('bg-foreground!');
    expect(clerkAppearance.elements.formButtonPrimary).toContain('text-background!');
  });
});
