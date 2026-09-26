import { describe, expect, it } from 'vitest';
import { ticketSignInUrl } from './ticket-sign-in-url';

describe('ticketSignInUrl', () => {
  it('redeems the ticket on the sign-in page, then goes on to the given path', () => {
    const url = new URL(ticketSignInUrl('https://web.sharpit.app', 'tk_1', '/'));
    expect(url.origin + url.pathname).toBe('https://web.sharpit.app/sign-in');
    expect(url.searchParams.get('__clerk_ticket')).toBe('tk_1');
    expect(url.searchParams.get('redirect_url')).toBe('https://web.sharpit.app/');
  });
});
