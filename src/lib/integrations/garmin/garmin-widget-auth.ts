/**
 * Garmin SSO web widget login (`/sso/embed` + `/sso/signin`) without a
 * rate-limited `clientId`, then ticket → DI OAuth2.
 *
 * Matches python-garminconnect ≥ 0.3 widget strategy conceptually, using the
 * platform `fetch` (no curl_cffi / node-libcurl-ja3 — those fail on Vercel).
 * If Cloudflare / bot scoring rejects serverless TLS, fail honestly as
 * `server_sso_rejected` — never claim the athlete's password is wrong.
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

/** Widget anti-WAF delay bounds — shorter than portal (python-garminconnect). */
export const WIDGET_DELAY_MIN_MS = 3_000;
export const WIDGET_DELAY_MAX_MS = 8_000;

const MAX_REDIRECTS = 8;

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
  | 'mfa_required'
  | 'rate_limited'
  | 'account_locked'
  /** Server-side SSO rejected (WAF / TLS / DI). Do NOT map to wrong password. */
  | 'server_sso_rejected'
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
  /** Injectable logger — defaults to console.info. Never pass secrets here. */
  log?: (message: string, meta?: Record<string, unknown>) => void;
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function defaultLog(message: string, meta?: Record<string, unknown>): void {
  if (meta) {
    console.info(message, meta);
  } else {
    console.info(message);
  }
}

/** Minimal cookie jar for the SSO widget (Set-Cookie → Cookie across redirects). */
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

  /** Test helper — cookie count only (never expose values in production logs). */
  size(): number {
    return this.jar.size;
  }
}

function withQuery(url: string, params: Record<string, string>): string {
  const q = new URLSearchParams(params);
  return `${url}?${q.toString()}`;
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

/**
 * Safe diagnostic log for widget steps — status, title, ticket presence only.
 * Never logs password, CSRF, cookies, or HTML body.
 */
export function logWidgetSsoOutcome(
  log: (message: string, meta?: Record<string, unknown>) => void,
  step: string,
  meta: { status: number; title?: string; ticketPresent?: boolean },
): void {
  log('[garmin/widget-sso]', {
    step,
    status: meta.status,
    title: meta.title ?? null,
    ticketPresent: meta.ticketPresent ?? false,
  });
}

function titleSuggestsAccountLocked(title: string): boolean {
  return title.toLowerCase().includes('locked');
}

function titleSuggestsCredentialPage(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.includes('invalid') ||
    lower.includes('incorrect') ||
    lower.includes('account error')
  );
}

function titleSuggestsInfraBlock(title: string): boolean {
  const lower = title.toLowerCase();
  return (
    lower.includes('bad gateway') ||
    lower.includes('service unavailable') ||
    lower.includes('cloudflare') ||
    lower.includes('access denied') ||
    lower.includes('attention required') ||
    lower.includes('502') ||
    lower.includes('503') ||
    lower.includes('403')
  );
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
  const log = deps.log ?? defaultLog;

  const cookies = new SimpleCookieJar();

  /**
   * Follow redirects manually so Set-Cookie on intermediate hops is kept.
   * `redirect: 'follow'` would drop hop cookies — python requests sessions keep them.
   */
  const request = async (
    url: string,
    init: {
      method: 'GET' | 'POST';
      referer?: string;
      body?: Record<string, string>;
    },
  ): Promise<{ response: Response; finalUrl: string; html: string }> => {
    let currentUrl = url;
    let method = init.method;
    let body = init.body;
    let referer = init.referer;

    for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
      const cookie = cookies.header();
      const headers: Record<string, string> = {
        'User-Agent': BROWSER_UA,
        Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...(cookie ? { Cookie: cookie } : {}),
        ...(referer ? { Referer: referer } : {}),
      };
      if (method === 'POST') {
        headers['Content-Type'] = 'application/x-www-form-urlencoded';
        headers.Origin = SSO_ORIGIN;
      }

      const res = await doFetch(currentUrl, {
        method,
        headers,
        body: method === 'POST' && body ? new URLSearchParams(body) : undefined,
        redirect: 'manual',
      });
      cookies.absorb(res);

      if (isRedirectStatus(res.status)) {
        const location = res.headers.get('location');
        if (!location) {
          throw new GarminWidgetAuthError(
            `Widget ${init.method} redirect without Location (HTTP ${res.status})`,
            'server_sso_rejected',
          );
        }
        const nextUrl = new URL(location, currentUrl).toString();
        referer = currentUrl;
        currentUrl = nextUrl;
        // 303 / POST→redirect → GET without body (browser behaviour).
        if (method === 'POST' && (res.status === 303 || res.status === 302 || res.status === 301)) {
          method = 'GET';
          body = undefined;
        }
        continue;
      }

      const html = await res.text();
      return { response: res, finalUrl: currentUrl, html };
    }

    throw new GarminWidgetAuthError('Widget SSO exceeded redirect limit', 'server_sso_rejected');
  };

  const embed = await request(withQuery(SSO_EMBED_URL, EMBED_PARAMS), { method: 'GET' });
  if (embed.response.status === 429) {
    throw new GarminWidgetAuthError('Widget embed GET rate limited (429)', 'rate_limited');
  }
  if (embed.response.status === 403 || !embed.response.ok) {
    logWidgetSsoOutcome(log, 'embed', { status: embed.response.status, title: '' });
    throw new GarminWidgetAuthError(
      `Widget embed GET failed: HTTP ${embed.response.status}`,
      'server_sso_rejected',
    );
  }

  const signinGetUrl = withQuery(SSO_SIGNIN_URL, SIGNIN_PARAMS);
  const signinGet = await request(signinGetUrl, {
    method: 'GET',
    referer: SSO_EMBED_URL,
  });
  if (signinGet.response.status === 429) {
    throw new GarminWidgetAuthError('Widget signin GET rate limited (429)', 'rate_limited');
  }
  if (signinGet.response.status === 403 || !signinGet.response.ok) {
    logWidgetSsoOutcome(log, 'signin-get', { status: signinGet.response.status });
    throw new GarminWidgetAuthError(
      `Widget signin GET failed: HTTP ${signinGet.response.status}`,
      'server_sso_rejected',
    );
  }

  const csrfMatch = CSRF_RE.exec(signinGet.html);
  if (!csrfMatch?.[1]) {
    logWidgetSsoOutcome(log, 'signin-get', {
      status: signinGet.response.status,
      title: TITLE_RE.exec(signinGet.html)?.[1]?.trim() ?? '',
      ticketPresent: false,
    });
    throw new GarminWidgetAuthError(
      'Widget login: missing CSRF token (server-side SSO likely blocked)',
      'server_sso_rejected',
    );
  }

  const delay =
    WIDGET_DELAY_MIN_MS +
    Math.floor(random() * (WIDGET_DELAY_MAX_MS - WIDGET_DELAY_MIN_MS + 1));
  await sleep(delay);

  // Fields aligned with python-garminconnect widget POST + rememberMe (HTML form).
  const signinPost = await request(signinGetUrl, {
    method: 'POST',
    referer: signinGet.finalUrl,
    body: {
      username,
      password,
      embed: 'true',
      _csrf: csrfMatch[1],
      rememberMe: 'on',
    },
  });

  const title = TITLE_RE.exec(signinPost.html)?.[1]?.trim() ?? '';
  const ticketMatch = TICKET_RE.exec(signinPost.html);
  const ticketPresent = Boolean(ticketMatch?.[1]);

  logWidgetSsoOutcome(log, 'signin-post', {
    status: signinPost.response.status,
    title,
    ticketPresent,
  });

  if (signinPost.response.status === 429) {
    throw new GarminWidgetAuthError('Widget signin POST rate limited (429)', 'rate_limited');
  }

  if (signinPost.response.status === 403) {
    throw new GarminWidgetAuthError(
      'Widget signin POST HTTP 403 (server-side SSO blocked)',
      'server_sso_rejected',
    );
  }

  if (titleSuggestsAccountLocked(title)) {
    throw new GarminWidgetAuthError(`Widget login: account locked (${title})`, 'account_locked');
  }

  if (looksLikeMfa(signinPost.html, title)) {
    throw new GarminWidgetAuthError(
      'Widget login: MFA required (not supported on this connect path)',
      'mfa_required',
    );
  }

  // From Vercel serverless, Garmin often returns an "invalid/incorrect" title even when
  // the password is correct (WAF / TLS fingerprint). Never tell the athlete their password is wrong.
  if (titleSuggestsCredentialPage(title) || titleSuggestsInfraBlock(title)) {
    throw new GarminWidgetAuthError(
      `Widget login: server-side SSO rejected (title='${title || '(empty)'}', HTTP ${signinPost.response.status})`,
      'server_sso_rejected',
    );
  }

  if (title.toLowerCase() !== 'success') {
    throw new GarminWidgetAuthError(
      `Widget login: unexpected page title '${title || '(empty)'}' (HTTP ${signinPost.response.status})`,
      'server_sso_rejected',
    );
  }

  if (!ticketMatch?.[1]) {
    throw new GarminWidgetAuthError(
      'Widget login: Success page without service ticket',
      'server_sso_rejected',
    );
  }

  try {
    return await exchangeServiceTicketForDiTokens(ticketMatch[1], SSO_EMBED_URL, {
      fetch: doFetch,
      now: deps.now,
    });
  } catch (error) {
    if (error instanceof GarminDiAuthError) {
      logWidgetSsoOutcome(log, 'di-exchange', {
        status: 0,
        title: error.kind,
        ticketPresent: true,
      });
      if (error.kind === 'rate_limited') {
        throw new GarminWidgetAuthError(error.message, 'rate_limited');
      }
      // DI 401 after a ticket is almost never "wrong password" — ticket/DI mismatch or bot scoring.
      throw new GarminWidgetAuthError(
        `Widget DI exchange failed after ticket: ${error.message}`,
        'server_sso_rejected',
      );
    }
    throw error;
  }
}
