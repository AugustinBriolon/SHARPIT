import type { Appearance } from "@clerk/types";

/** Palette SharpIt — alignée sur globals.css (light Bevel / vert pousse). */
const SHARPIT = {
  primary: "#3a9e6a",
  primaryHover: "#2f8558",
  background: "#fafbf9",
  foreground: "#1a2e24",
  muted: "#6b7c72",
  card: "#ffffff",
  border: "#dfe8e2",
  input: "#ffffff",
  danger: "#dc2626",
  success: "#059669",
  warning: "#d97706",
  radius: "0.625rem",
} as const;

export const clerkAppearance: Appearance = {
  variables: {
    colorPrimary: SHARPIT.primary,
    colorBackground: SHARPIT.card,
    colorInputBackground: SHARPIT.input,
    colorInputText: SHARPIT.foreground,
    colorText: SHARPIT.foreground,
    colorTextSecondary: SHARPIT.muted,
    colorTextOnPrimaryBackground: "#ffffff",
    colorDanger: SHARPIT.danger,
    colorSuccess: SHARPIT.success,
    colorWarning: SHARPIT.warning,
    colorNeutral: SHARPIT.muted,
    borderRadius: SHARPIT.radius,
    fontFamily: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
    fontFamilyButtons: "var(--font-sans), ui-sans-serif, system-ui, sans-serif",
    fontSize: "0.875rem",
  },
  elements: {
    rootBox: "mx-auto w-full max-w-[420px]",
    card: "rounded-xl border border-border/80 bg-card shadow-none",
    headerTitle: "font-heading text-xl font-semibold tracking-tight text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsBlockButton:
      "rounded-lg border border-border bg-background text-foreground hover:bg-muted/60",
    socialButtonsBlockButtonText: "font-medium text-foreground",
    formButtonPrimary:
      "rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 shadow-none",
    formFieldInput:
      "rounded-lg border border-input bg-background text-foreground focus:ring-ring/50",
    formFieldLabel: "text-foreground font-medium",
    footerActionLink: "text-primary hover:text-primary/80",
    identityPreviewEditButton: "text-primary",
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground",
    navbar: "hidden",
    footer: "bg-transparent",
    userButtonPopoverCard: "rounded-xl border border-border/80 shadow-lg",
    userButtonPopoverActionButton: "hover:bg-muted/60",
    userButtonPopoverActionButtonText: "text-foreground",
    userButtonPopoverFooter: "hidden",
  },
};
