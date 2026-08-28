export const NUMERIC_INPUT_CLASS = 'text-data tabular-nums';

export function paceToInput(secPerKm: number | null): string {
  if (secPerKm === null) {
    return '';
  }
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function parseClockInput(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parts = value.split(':');
  if (parts.length !== 2) {
    return null;
  }
  const h = Number(parts[0]);
  const m = Number(parts[1]);
  if (!Number.isFinite(h) || !Number.isFinite(m)) {
    return null;
  }
  return h * 60 + m;
}

export function clockToInput(min: number | null): string {
  if (min === null) {
    return '';
  }
  const h = Math.floor(min / 60);
  const m = Math.round(min % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function parsePaceInput(value: string): number | null {
  if (!value.trim()) {
    return null;
  }
  const parts = value.split(':');
  if (parts.length !== 2) {
    return null;
  }
  const m = Number(parts[0]);
  const s = Number(parts[1]);
  if (!Number.isFinite(m) || !Number.isFinite(s)) {
    return null;
  }
  return m * 60 + s;
}
