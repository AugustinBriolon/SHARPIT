const DEFAULT_DEV_PORT = 3000;

function devPort(): string {
  if (typeof window !== 'undefined' && window.location.port) {
    return window.location.port;
  }
  return String(DEFAULT_DEV_PORT);
}

/** True si l'app est ouverte via une IP LAN (Google OAuth HTTP interdit hors localhost). */
export function isGoogleOAuthBlockedOnCurrentHost(): boolean {
  if (typeof window === 'undefined') return false;
  const { hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') return false;
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

export function googleOAuthLocalConnectHref(): string {
  return `http://localhost:${devPort()}/api/google/connect`;
}

export const GOOGLE_OAUTH_LAN_HINT =
  "Google n'accepte pas les redirections OAuth en HTTP vers une IP locale (ex. 192.168.x.x). Ouvre l'app sur http://localhost:3000 pour connecter Google Calendar, ou configure GOOGLE_REDIRECT_URI avec une URL HTTPS (tunnel type ngrok).";
