import http2 from 'node:http2';
import crypto from 'node:crypto';

export type ApnsConfig = {
  keyId: string;
  teamId: string;
  privateKey: string;
  bundleId: string;
  production: boolean;
};

export type ApnsPayload = {
  aps: {
    alert: {
      title: string;
      body: string;
    };
    sound?: string;
    badge?: number;
    'thread-id'?: string;
    category?: string;
  };
  url?: string;
  trainingDayId?: string;
  verdict?: string | null;
  [key: string]: unknown;
};

export type ApnsSendResult = {
  success: boolean;
  status: number;
  apnsId?: string;
  reason?: string;
  deviceToken: string;
};

let cachedJwt: { token: string; expiresAtSec: number; keyId: string } | null = null;

function normalizePrivateKey(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('-----BEGIN')) {
    return trimmed;
  }
  // Try decoding base64 if not directly PEM formatted
  try {
    const decoded = Buffer.from(trimmed, 'base64').toString('utf8');
    if (decoded.startsWith('-----BEGIN')) {
      return decoded.trim();
    }
  } catch {}
  return trimmed;
}

export function getApnsConfig(): ApnsConfig | null {
  const keyId = process.env.APNS_KEY_ID?.trim();
  const teamId = process.env.APNS_TEAM_ID?.trim() || process.env.APPLE_TEAM_ID?.trim();
  const rawKey = process.env.APNS_PRIVATE_KEY?.trim();

  if (!keyId || !teamId || !rawKey) {
    return null;
  }

  const bundleId = process.env.APNS_BUNDLE_ID?.trim() || 'app.sharpit.ios';
  const production =
    process.env.APNS_PRODUCTION === 'true'
      ? true
      : process.env.APNS_PRODUCTION === 'false'
        ? false
        : process.env.NODE_ENV === 'production';

  return {
    keyId,
    teamId,
    privateKey: normalizePrivateKey(rawKey),
    bundleId,
    production,
  };
}

export function isApnsConfigured(): boolean {
  return getApnsConfig() !== null;
}

/**
 * Creates or returns a cached Apple Push Notification service JWT token.
 * Token valid for 50 minutes (Apple maximum is 60 minutes).
 */
export function getOrSignApnsToken(
  config: ApnsConfig,
  nowSec = Math.floor(Date.now() / 1000),
): string {
  if (cachedJwt && cachedJwt.keyId === config.keyId && cachedJwt.expiresAtSec > nowSec + 60) {
    return cachedJwt.token;
  }

  const header = Buffer.from(JSON.stringify({ alg: 'ES256', kid: config.keyId })).toString(
    'base64url',
  );

  const claims = Buffer.from(JSON.stringify({ iss: config.teamId, iat: nowSec })).toString(
    'base64url',
  );

  const unsigned = `${header}.${claims}`;

  const signature = crypto
    .sign('sha256', Buffer.from(unsigned), {
      key: config.privateKey,
      dsaEncoding: 'ieee-p1363',
    })
    .toString('base64url');

  const token = `${unsigned}.${signature}`;
  cachedJwt = {
    token,
    expiresAtSec: nowSec + 50 * 60,
    keyId: config.keyId,
  };

  return token;
}

/** Determines if an APNs error indicates that the device token should be pruned. */
export function isTokenExpiredOrInvalid(status: number, reason?: string): boolean {
  if (status === 410) {
    return true; // Unregistered / Expired
  }
  if (status === 400 && (reason === 'BadDeviceToken' || reason === 'DeviceTokenNotForTopic')) {
    return true;
  }
  return false;
}

/**
 * Sends a single APNs push notification over HTTP/2.
 */
export async function sendApnsNotification(options: {
  deviceToken: string;
  payload: ApnsPayload;
  config?: ApnsConfig | null;
}): Promise<ApnsSendResult> {
  const config = options.config ?? getApnsConfig();
  if (!config) {
    return {
      success: false,
      status: 0,
      reason: 'APNS_NOT_CONFIGURED',
      deviceToken: options.deviceToken,
    };
  }

  const host = config.production
    ? 'https://api.push.apple.com'
    : 'https://api.sandbox.push.apple.com';

  const jwt = getOrSignApnsToken(config);
  const body = JSON.stringify(options.payload);

  return new Promise((resolve) => {
    let client: http2.ClientHttp2Session | null = null;
    let settled = false;

    const cleanup = () => {
      if (client && !client.destroyed) {
        try {
          client.close();
        } catch {}
      }
    };

    const done = (result: ApnsSendResult) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(result);
    };

    try {
      client = http2.connect(host);
    } catch (err) {
      done({
        success: false,
        status: 0,
        reason: err instanceof Error ? err.message : 'HTTP2_CONNECT_FAILED',
        deviceToken: options.deviceToken,
      });
      return;
    }

    client.on('error', (err) => {
      done({
        success: false,
        status: 0,
        reason: err.message,
        deviceToken: options.deviceToken,
      });
    });

    const req = client.request({
      [http2.constants.HTTP2_HEADER_METHOD]: http2.constants.HTTP2_METHOD_POST,
      [http2.constants.HTTP2_HEADER_PATH]: `/3/device/${options.deviceToken}`,
      authorization: `bearer ${jwt}`,
      'apns-topic': config.bundleId,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'apns-expiration': '0',
      'content-type': 'application/json',
      'content-length': Buffer.byteLength(body),
    });

    let resBody = '';
    let status = 0;
    let apnsId: string | undefined;

    req.on('response', (headers) => {
      status = Number(headers[http2.constants.HTTP2_HEADER_STATUS]) || 0;
      apnsId = headers['apns-id'] as string | undefined;
    });

    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      resBody += chunk;
    });

    req.on('end', () => {
      let reason: string | undefined;
      if (resBody) {
        try {
          const parsed = JSON.parse(resBody);
          reason = parsed.reason;
        } catch {
          reason = resBody;
        }
      }

      done({
        success: status === 200,
        status,
        apnsId,
        reason,
        deviceToken: options.deviceToken,
      });
    });

    req.on('error', (err) => {
      done({
        success: false,
        status: 0,
        reason: err.message,
        deviceToken: options.deviceToken,
      });
    });

    req.setTimeout(10_000, () => {
      req.close(http2.constants.NGHTTP2_CANCEL);
      done({
        success: false,
        status: 408,
        reason: 'TIMEOUT',
        deviceToken: options.deviceToken,
      });
    });

    req.write(body);
    req.end();
  });
}
