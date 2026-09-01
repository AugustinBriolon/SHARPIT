/**
 * Garmin SSO web widget login (`/sso/embed` + `/sso/signin`) without a
 * rate-limited `clientId`, then ticket → DI OAuth2.
 *
 * Matches python-garminconnect ≥ 0.3 widget strategy conceptually, using the
 * platform `fetch` (no curl_cffi / node-libcurl-ja3 — those fail on Vercel).
 * If Cloudflare blocks the HTML form on serverless, fail cleanly — do not invent
 * TLS impersonation bypasses.
 */

import {
  exchangeServiceTicketForDiTokens,
  type GarminDiOauthDeps,
  type GarminDiTokens,
  GarminDiAuthError,
} from '@/lib/integrations/garmin/garmin-di-oauth';

const SSO_ORIGIN = 'https://sso.garmin.com';
const SSO_BASE = `${SSO_ORIGIN}/sso`;
export const SSO_EMBED_URL = `${SSO_BASE}/embed`;
export const SSO_SIGNIN_URL = `${SSO_BASE}/signin`;

const CSRF_RE = /name=["']_csrf["']\s+value=["']([^"']+)["']/i;
const TITLE_RE = /<title>([^<]*)<\/title>/i;
const TICKET_RE = /\?ticket=(ST-[^"&\s]+)/;

const BROWSER_UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

/** Widget anti-WAF delay bounds (seconds) — shorter than portal. */
export const WIDGET_DELAY_MIN_MS = 3_000;
export const WIDGET_DELAY_MAX_MS = 8_000;

const EMBED_PARAMS: Record<string, string> = {
  id: 'gauth-widget',
  embedWidget: 'true',
  gauthHost: SSO_BASE,
};

const SIGNIN_PARAMS: Record<string, string> = {
  ...EMBED_PARAMS,
  gauthHost: SSO_EMBED_URL,
  service: SSO_EMBED_URL,
  source: SSO_EMBED_URL,
  redirectAfterAccountLoginUrl: SSO_EMBED_URL,
  redirectAfterAccountCreationUrl: SSO_EMBED_URL,
};

export type GarminWidgetAuthFailureKind =
  | 'invalid_credentials'
  | 'mfa_required'
  | 'rate_limited'
  | 'account_locked'
  | 'unknown';

export class GarminWidgetAuthError extends Error {
  constructor(
    message: string,
    public readonly kind: GarminWidgetAuthFailureKind,
  ) {
    super(message);
    this.name = 'GarminWidgetAuthError';
  }
}

export interface GarminWidgetAuthDeps extends Partial<GarminDiOauthDeps> {
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Minimal cookie jar for the SSO widget (Set-Cookie → Cookie). */
export class SimpleCookieJar {
  private readonly jar = new Map<string, string>();

  absorb(response: Response): void {
    const headers = response.headers as Headers & { getSetCookie?: () => string[] };
    const lines =
      typeof headers.getSetCookie === 'function'
        ? headers.getSetCookie()
        : (() => {
            const single = response.headers.get('set-cookie');
            return single ? [single] : [];
          })();
    for (const line of lines) {
      const pair = line.split(';', 1)[0];
      if (!pair) continue;
      const eq = pair.indexOf('=');
      if (eq <= 0) continue;
      const name = pair.slice(0, eq).trim();
      const value = pair.slice(eq + 1).trim();
      if (name) {
        this.jar.set(name, value);
      }
    }
  }

  header(): string | undefined {
    if (this.jar.size === 0) return undefined;
    return [...this.jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }
}

function withQuery(url: string, params: Record<string, string>): string {
  const q = new URLSearchParams(params);
  return `${url}?${q.toString()}`;
}

function classifyTitle(title: string): GarminWidgetAuthError | null {
  const lower = title.toLowerCase();
  if (lower.includes('locked')) {
    return new GarminWidgetAuthError(`Widget login: account locked (${title})`, 'account_locked');
  }
  if (
    lower.includes('invalid') ||
    lower.includes('incorrect') ||
    lower.includes('account error')
  ) {
    return new GarminWidgetAuthError(
      `Widget login: invalid credentials (${title})`,
      'invalid_credentials',
    );
  }
  if (lower.includes('mfa') || lower.includes('authentication application')) {
    // Title alone can false-positive on the bare signin page; callers also check MFA JS vars.
    return null;
  }
  return null;
}

function looksLikeMfa(html: string, title: string): boolean {
  const lower = title.toLowerCase();
  if (lower.includes('mfa')) return true;
  const hasMfaMethod = /mfaMethod\s*[:=]\s*['"][^'"]+['"]/i.test(html);
  return lower.includes('authentication application') && hasMfaMethod;
}

/**
 * Interactive connect path: widget HTML form (no clientId) → DI OAuth2 tokens.
 * Must never be called from cron / background sync.
 */
export async function loginGarminWidget(
  username: string,
  password: string,
  deps: GarminWidgetAuthDeps = {},
): Promise<GarminDiTokens> {
  const doFetch = deps.fetch ?? globalThis.fetch.bind(globalThis);
  const sleep = deps.sleep ?? defaultSleep;
  const random = deps.random ?? Math.random;

  const cookies = new SimpleCookieJar();

  const get = async (url: string, referer?: string): Promise<Response> => {
    const cookie = cookies.header();
    const res = await doFetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(referer ? { Referer: referer } : {}),
      },
      redirect: 'follow',
    });
    cookies.absorb(res);
    return res;
  };

  const postForm = async (
    url: string,
    body: Record<string, string>,
    referer: string,
  ): Promise<Response> => {
    const cookie = cookies.header();
    const res = await doFetch(url, {
      method: 'POST',
      headers: {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Content-Type': 'application/x-www-form-urlencoded',
        Origin: SSO_ORIGIN,
        Referer: referer,
        ...(cookie ? { Cookie: cookie } : {}),
      },
      body: new URLSearchParams(body),
      redirect: 'follow',
    });
    cookies.absorb(res);
    return res;
  };

  const embedRes = await get(withQuery(SSO_EMBED_URL, EMBED_PARAMS));
  if (embedRes.status === 429) {
    throw new GarminWidgetAuthError('Widget embed GET rate limited (429)', 'rate_limited');
  }
  if (!embedRes.ok) {
    throw new GarminWidgetAuthError(
      `Widget embed GET failed: HTTP ${embedRes.status}`,
      'unknown',
    );
  }

  const signinGetUrl = withQuery(SSO_SIGNIN_URL, SIGNIN_PARAMS);
  const signinGet = await get(signinGetUrl, SSO_EMBED_URL);
  if (signinGet.status === 429) {
    throw new GarminWidgetAuthError('Widget signin GET rate limited (429)', 'rate_limited');
  }
  if (!signinGet.ok) {
    throw new GarminWidgetAuthError(
      `Widget signin GET failed: HTTP ${signinGet.status}`,
      'unknown',
    );
  }

  const signinHtml = await signinGet.text();
  const csrfMatch = CSRF_RE.exec(signinHtml);
  if (!csrfMatch?.[1]) {
    throw new GarminWidgetAuthError('Widget login: missing CSRF token', 'unknown');
  }

  const delay =
    WIDGET_DELAY_MIN_MS +
    Math.floor(random() * (WIDGET_DELAY_MAX_MS - WIDGET_DELAY_MIN_MS + 1));
  await sleep(delay);

  const signinPost = await postForm(
    signinGetUrl,
    {
      username,
      password,
      embed: 'true',
      _csrf: csrfMatch[1],
    },
    signinGetUrl,
  );

  if (signinPost.status === 429) {
    throw new GarminWidgetAuthError('Widget signin POST rate limited (429)', 'rate_limited');
  }

  const postHtml = await signinPost.text();
  const titleMatch = TITLE_RE.exec(postHtml);
  const title = titleMatch?.[1]?.trim() ?? '';

  const titleError = classifyTitle(title);
  if (titleError) {
    throw titleError;
  }

  if (looksLikeMfa(postHtml, title)) {
    throw new GarminWidgetAuthError(
      'Widget login: MFA required (not supported on this connect path)',
      'mfa_required',
    );
  }

  if (title.toLowerCase() !== 'success') {
    // Cloudflare / unexpected HTML — do not retry SSO in a loop.
    throw new GarminWidgetAuthError(
      `Widget login: unexpected page title '${title || '(empty)'}'`,
      'unknown',
    );
  }

  const ticketMatch = TICKET_RE.exec(postHtml);
  if (!ticketMatch?.[1]) {
    throw new GarminWidgetAuthError('Widget login: missing service ticket', 'unknown');
  }

  try {
    return await exchangeServiceTicketForDiTokens(ticketMatch[1], SSO_EMBED_URL, {
      fetch: doFetch,
      now: deps.now,
    });
  } catch (error) {
    if (error instanceof GarminDiAuthError) {
      throw new GarminWidgetAuthError(error.message, error.kind === 'rate_limited' ? 'rate_limited' : 'unknown');
    }
    throw error;
  }
}
