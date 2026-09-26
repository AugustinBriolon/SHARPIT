import { apiFetch } from '@sharpit/ui/client/query/api-fetch';

export type GarminSsoTicketResult =
  { ok: true; redirectTo: string } | { ok: false; status: string | undefined };

/** Browser SSO ticket exchange — keep fetch here (not in components). */
export async function exchangeGarminSsoTicket(
  ticket: string,
  state: string,
): Promise<GarminSsoTicketResult> {
  const response = await apiFetch('/api/garmin/sso-callback', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticket, state }),
  });
  const data = (await response.json().catch(() => null)) as {
    redirectTo?: string;
    status?: string;
  } | null;
  if (!response.ok || !data?.redirectTo) {
    return { ok: false, status: data?.status };
  }
  return { ok: true, redirectTo: data.redirectTo };
}
