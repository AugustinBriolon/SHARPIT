/** Pure (no Clerk import): client components build handoff URLs with it too. */

/**
 * The web's sign-in page redeeming a ticket (`__clerk_ticket`), then going on to `redirectPath`
 * — the visitor never types a password. The URL is a credential — never log it.
 */
export function ticketSignInUrl(origin: string, ticket: string, redirectPath: string): string {
  const url = new URL('/sign-in', origin);
  url.searchParams.set('__clerk_ticket', ticket);
  url.searchParams.set('redirect_url', new URL(redirectPath, origin).toString());
  return url.toString();
}
