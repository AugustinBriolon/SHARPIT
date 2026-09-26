/**
 * Where every sign-in and sign-up lands (Clerk fallback redirect). A route handler, not
 * a page: it answers with a redirect straight to the athlete's next screen, so a new
 * account goes welcome → sign-up → consent → onboarding without Today (and its
 * skeleton) ever rendering in between. Client-safe — no server imports.
 */
export const ENTRY_PATH = '/start';
