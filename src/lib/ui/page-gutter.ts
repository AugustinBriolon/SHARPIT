/**
 * Documents the shell gutter contract used by `page-bleed` / `page-bleed-muted` /
 * `page-bleed-ink`. Values must stay in sync with `AppShell`
 * (`[--page-gutter:…]` / `lg:[--page-gutter:…]`).
 */
export const PAGE_GUTTER = {
  mobile: '1rem',
  desktop: '1.5rem',
} as const;

/** Centered reading column — same shell on every viewport. */
export const PAGE_CONTENT_MAX_CLASS = 'max-w-5xl';
