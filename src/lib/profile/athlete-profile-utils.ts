/** Parse une date ISO `YYYY-MM-DD` en Date UTC (sans décalage fuseau). */
export function parseBirthDateInput(value: string | null | undefined): Date | null {
  if (!value?.trim()) {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (!match) {
    return null;
  }
  const [, y, m, d] = match;
  return new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
}

/** Formate une date de naissance pour `<input type="date">`. */
export function birthDateToInput(date: Date | string | null | undefined): string {
  if (!date) {
    return '';
  }
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function parseBirthInstant(
  birthDate: Date | string | null | undefined,
): Date | null {
  if (!birthDate) {
    return null;
  }
  const birth = typeof birthDate === 'string' ? new Date(birthDate) : birthDate;
  return Number.isNaN(birth.getTime()) ? null : birth;
}

function ageFromInstants(birth: Date, referenceDate: Date): number | null {
  let age = referenceDate.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = referenceDate.getUTCMonth() - birth.getUTCMonth();
  const dayDiff = referenceDate.getUTCDate() - birth.getUTCDate();
  if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) {
    age--;
  }
  return age >= 0 ? age : null;
}

/** Âge en années entières à partir de la date de naissance. */
export function athleteAgeYears(
  birthDate: Date | string | null | undefined,
  referenceDate = new Date(),
): number | null {
  const birth = parseBirthInstant(birthDate);
  return birth ? ageFromInstants(birth, referenceDate) : null;
}

export function athleteCompositionContext(
  profile:
    | {
        heightCm?: number | null;
        birthDate?: Date | string | null;
      }
    | null
    | undefined,
): { chronoAge: number | null; heightM: number | null } {
  return {
    chronoAge: athleteAgeYears(profile?.birthDate ?? null),
    heightM: (profile?.heightCm !== undefined && profile?.heightCm !== null) ? profile.heightCm / 100 : null,
  };
}
