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

/** 1–2 uppercase initials for the nav avatar. */
export function initialsFromName({ firstName, lastName, fullName }: NameParts): string {
  const first = firstName?.trim() ?? '';
  const last = lastName?.trim() ?? '';
  if (first || last) {
    const a = firstLetter(first);
    const b = firstLetter(last);
    const joined = `${a}${b}`;
    if (joined) {
      return joined;
    }
  }

  const full = fullName?.trim() ?? '';
  if (full) {
    const parts = full.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${firstLetter(parts[0]!)}${firstLetter(parts[parts.length - 1]!)}`;
    }
    const letter = firstLetter(parts[0] ?? '');
    if (letter) {
      return letter;
    }
  }

  return '?';
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
