import { shadcn } from '@clerk/themes';

import { BRAND } from '@/lib/brand/brand-tokens';

/**
 * Clerk ↔ SHARPIT theme bridge.
 *
 * Use semantic CSS variables (not hex) so light/dark flip with `.dark` /
 * `color-scheme` — the previous Forest Depths hex primary was illegible on the
 * dark canvas. Surfaces already follow globals.css via the shadcn base theme.
 */
const clerkColorVariables = {
  colorPrimary: 'var(--primary)',
  colorPrimaryForeground: 'var(--primary-foreground)',
  colorBackground: 'var(--card)',
  colorForeground: 'var(--card-foreground)',
  colorMuted: 'var(--muted)',
  colorMutedForeground: 'var(--muted-foreground)',
  /** Solid fill — SHARPIT `--input` is a border token, not an input background. */
  colorInput: 'var(--background)',
  colorInputForeground: 'var(--foreground)',
  colorNeutral: 'var(--foreground)',
  colorBorder: 'var(--border)',
  colorRing: 'var(--ring)',
  colorDanger: 'var(--destructive)',
} as const;

/**
 * Element classNames reinforce token contrast on auth controls.
 * Prefer full `border-border` (not /80) so dark-mode hairlines stay readable.
 */
const elements = {
  rootBox: 'mx-auto w-full max-w-[420px]',
  cardBox: 'shadow-none border border-border rounded-xl bg-card dark:border-foreground/20',
  card: 'rounded-xl border-0 bg-transparent shadow-none gap-4',
  header: 'gap-1',
  headerTitle: 'font-heading text-lg font-semibold text-foreground',
  headerSubtitle: 'text-sm text-muted-foreground',
  socialButtonsBlockButton:
    'rounded-lg border border-border bg-background text-foreground! shadow-none hover:bg-muted/60 dark:border-foreground/30 dark:bg-card dark:hover:bg-muted',
  socialButtonsBlockButtonText: 'font-medium text-foreground!',
  /**
   * Ink CTA (Seed) — force over Clerk solid primary paint. Without `!`,
   * colorPrimary + flipped colorPrimaryForeground made Continuer illegible
   * when primary was still a dark hex.
   */
  formButtonPrimary:
    'rounded-lg bg-foreground! text-background! shadow-none hover:bg-foreground/90!',
  formFieldInput:
    'rounded-lg border border-input bg-background! text-foreground! placeholder:text-foreground/55! shadow-none focus:ring-2 focus:ring-ring/40 dark:border-foreground/30 dark:bg-background!',
  formFieldLabel: 'font-medium text-foreground!',
  formFieldHintText: 'text-muted-foreground',
  formFieldErrorText: 'text-destructive!',
  formFieldSuccessText: 'text-foreground',
  formFieldInputShowPasswordButton: 'text-muted-foreground hover:text-foreground',
  footerActionLink: 'text-primary! hover:text-primary/80 font-medium',
  identityPreviewEditButton: 'text-primary!',
  identityPreviewText: 'text-foreground!',
  dividerLine: 'bg-border dark:bg-foreground/25',
  dividerText: 'text-foreground/70 text-xs uppercase tracking-wider',
  navbar: 'hidden',
  footer: 'bg-transparent',
  footerActionText: 'text-foreground/70',
  formFieldAction: 'text-primary!',
  otpCodeFieldInput:
    'rounded-lg border border-input bg-background! text-foreground! dark:border-foreground/30',
  alertText: 'text-foreground!',
  alertText__danger: 'text-destructive!',
  formResendCodeLink: 'text-primary!',
  alternativeMethodsBlockButton:
    'rounded-lg border border-border bg-background text-foreground! shadow-none hover:bg-muted/60 dark:border-foreground/30 dark:bg-card',
  alternativeMethodsBlockButtonText: 'font-medium text-foreground!',
  userButtonPopoverCard: 'rounded-xl border border-border bg-card shadow-none',
  userButtonPopoverActionButton: 'hover:bg-muted/60',
  userButtonPopoverActionButtonText: 'text-foreground',
  userPreviewMainIdentifier: 'font-medium text-foreground',
  userPreviewSecondaryIdentifier: 'text-muted-foreground',
  userButtonPopoverFooter: 'hidden',
} as const;

export const clerkAppearance = {
  theme: shadcn,
  variables: {
    ...clerkColorVariables,
    borderRadius: BRAND.radius,
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
