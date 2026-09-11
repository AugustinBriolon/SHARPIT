/**
 * Shared JSON fetch + date hydration helpers for client fetchers.
 */

export async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Requête échouée (${res.status}) sur ${url}`);
  }
  return res.json() as Promise<T>;
}

/**
 * Représentation « sur le fil » d'un type client : les `Date` deviennent des
 * `string` (JSON), récursivement. Typer le payload reçu avec `Serialized<T>` puis
 * réhydrater les champs date donne un résultat structurellement égal à `T`, sans
 * aucun cast `as unknown as` (les erreurs de mapping redeviennent visibles).
 */
export type Serialized<T> = T extends Date
  ? string
  : T extends (infer U)[]
    ? Serialized<U>[]
    : T extends object
      ? { [K in keyof T]: Serialized<T[K]> }
      : T;

export function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

export function toDateOrNull(value: string | Date | null | undefined): Date | null {
  if (value === undefined || value === null) {
    return null;
  }
  return value instanceof Date ? value : new Date(value);
}
