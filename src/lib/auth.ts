import type { User } from "@clerk/backend";

/**
 * App mono-utilisateur : seuls les emails listés dans ALLOWED_EMAILS
 * (séparés par des virgules) peuvent accéder à l'app.
 *
 * Si ALLOWED_EMAILS est vide, on autorise tout utilisateur connecté
 * (pratique au tout premier lancement pour récupérer ton propre id/email,
 * mais pense à le renseigner ensuite).
 */
export function getAllowedEmails(): string[] {
  return (process.env.ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedUser(user: User | null): boolean {
  if (!user) return false;

  const allowed = getAllowedEmails();
  if (allowed.length === 0) return true; // pas de restriction configurée

  const emails = user.emailAddresses.map((e) =>
    e.emailAddress.toLowerCase(),
  );
  return emails.some((email) => allowed.includes(email));
}
