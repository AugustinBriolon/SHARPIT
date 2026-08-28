/**
 * Athlete display identity derived from Clerk profile fields.
 *
 * Pure helpers — the nav reads Clerk via `useUser()` and passes the strings
 * here. No AthleteProfile name fields exist today.
 */

export type NameParts = {
  firstName?: string | null;
  lastName?: string | null;
  fullName?: string | null;
};

function firstLetter(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }
  return trimmed[0]!.toLocaleUpperCase('fr-FR');
}

function firstWord(value: string): string {
  const match = value.trim().match(/^\S+/);
  return match?.[0] ?? '';
}

function initialsFromFirstLast(first: string, last: string): string | null {
  const joined = `${firstLetter(first)}${firstLetter(last)}`;
  return joined || null;
}

function initialsFromFullName(full: string): string | null {
  const parts = full.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${firstLetter(parts[0]!)}${firstLetter(parts[parts.length - 1]!)}`;
  }
  const letter = firstLetter(parts[0] ?? '');
  return letter || null;
}

function initialsFromOptionalFullName(fullName?: string | null): string | null {
  const trimmed = fullName?.trim();
  if (!trimmed) {
    return null;
  }
  return initialsFromFullName(trimmed);
}

function resolveInitialsFromNameParts(parts: NameParts): string {
  const fromNames = initialsFromFirstLast(parts.firstName?.trim() ?? '', parts.lastName?.trim() ?? '');
  return fromNames ?? initialsFromOptionalFullName(parts.fullName) ?? '?';
}

/** 1–2 uppercase initials for the nav avatar. */
export function initialsFromName(parts: NameParts): string {
  return resolveInitialsFromNameParts(parts);
}

/** Bottom-nav / sidebar primary label — first name when known. */
export function shortLabelFromName({ firstName, fullName }: NameParts): string {
  const first = firstName?.trim();
  if (first) {
    return first;
  }

  const fromFull = fullName?.trim() ? firstWord(fullName) : '';
  if (fromFull) {
    return fromFull;
  }

  return 'Profil';
}

/** Demo tenant fallback when there is no Clerk session. */
export const DEMO_IDENTITY = {
  initials: 'D',
  shortLabel: 'Démo',
} as const;
