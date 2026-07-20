import { shadcn } from '@clerk/themes';

import { BRAND } from '@/lib/brand-tokens';

/** Tokens SharpIt — primary brand only; surfaces follow globals.css via shadcn theme. */
const SHARPIT = {
  /** Clerk filled CTA aligns with Seed ink (Forest), not leaf interactive */
  primary: BRAND.forestDepths,
  radius: BRAND.radius,
} as const;

const elements = {
  rootBox: 'mx-auto w-full max-w-[420px]',
  cardBox: 'shadow-none border border-border/80 rounded-xl bg-card',
  card: 'rounded-xl border-0 bg-transparent shadow-none gap-4',
  header: 'gap-1',
  headerTitle: 'font-heading text-lg font-semibold  text-foreground',
  headerSubtitle: 'text-sm text-muted-foreground',
  socialButtonsBlockButton:
    'rounded-lg border border-border bg-background text-foreground shadow-none hover:bg-muted/60',
  socialButtonsBlockButtonText: 'font-medium text-foreground',
  formButtonPrimary: 'rounded-lg bg-foreground text-background shadow-none hover:bg-foreground/90',
  formFieldInput:
    'rounded-lg border border-input bg-background text-foreground shadow-none focus:ring-2 focus:ring-ring/30',
  formFieldLabel: 'font-medium text-foreground',
  footerActionLink: 'text-primary hover:text-primary/80 font-medium',
  identityPreviewEditButton: 'text-primary',
  dividerLine: 'bg-border',
  dividerText: 'text-muted-foreground text-xs uppercase tracking-wider',
  navbar: 'hidden',
  footer: 'bg-transparent',
  footerActionText: 'text-muted-foreground',
  formFieldAction: 'text-primary',
  otpCodeFieldInput: 'rounded-lg border border-input bg-background',
  alertText: 'text-foreground',
  formResendCodeLink: 'text-primary',
  userButtonPopoverCard: 'rounded-xl border border-border/80 bg-card shadow-none',
  userButtonPopoverActionButton: 'hover:bg-muted/60',
  userButtonPopoverActionButtonText: 'text-foreground',
  userPreviewMainIdentifier: 'font-medium text-foreground',
  userPreviewSecondaryIdentifier: 'text-muted-foreground',
  userButtonPopoverFooter: 'hidden',
} as const;

export const clerkAppearance = {
  theme: shadcn,
  variables: {
    colorPrimary: SHARPIT.primary,
    borderRadius: SHARPIT.radius,
    fontFamily: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
    fontFamilyButtons: 'var(--font-sans), ui-sans-serif, system-ui, sans-serif',
    fontSize: '0.875rem',
  },
  elements,
};

/** Auth pages : branding déjà dans AuthShell → header Clerk allégé. */
export const authAppearance = {
  ...clerkAppearance,
  elements: {
    ...elements,
    headerTitle: 'hidden',
    headerSubtitle: 'hidden',
    logoBox: 'hidden',
    footer: 'bg-transparent pt-2',
  },
};
