import { clerkClient } from '@clerk/nextjs/server';

/** Long enough to open the page, short enough that a leaked URL is already dead. */
const TICKET_TTL_SECONDS = 60;

/** A one-time Clerk sign-in ticket for `userId`. A credential — never log it. */
export async function createSignInTicket(userId: string): Promise<string> {
  const client = await clerkClient();
  const { token } = await client.signInTokens.createSignInToken({
    userId,
    expiresInSeconds: TICKET_TTL_SECONDS,
  });
  return token;
}

export { ticketSignInUrl } from '@sharpit/server/lib/auth/ticket-sign-in-url';
