const DEFAULT_PORT = 3000;

export function getDevLanHost(): string | null {
  const host = process.env.DEV_LAN_HOST?.trim();
  return host || null;
}

/** Origines HTTP utilisables en dev (localhost + IP LAN configurée). */
export function getDevAppOrigins(port = DEFAULT_PORT): string[] {
  const origins = new Set<string>([`http://localhost:${port}`]);
  const lanHost = getDevLanHost();
  if (lanHost) origins.add(`http://${lanHost}:${port}`);
  return [...origins];
}

/** Hôtes autorisés pour Next.js `allowedDevOrigins` (sans schéma ni port). */
export function getAllowedDevOriginHosts(): string[] {
  const hosts = new Set<string>(['localhost']);
  const lanHost = getDevLanHost();
  if (lanHost) hosts.add(lanHost);
  return [...hosts];
}

/** Origines Clerk en dev — strings uniquement (pas de RegExp : non sérialisable RSC → client). */
export function getClerkAllowedRedirectOrigins(port = DEFAULT_PORT): string[] | undefined {
  if (process.env.NODE_ENV !== 'development') return undefined;
  return getDevAppOrigins(port);
}
