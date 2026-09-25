/** Athlete-facing copy never uses an em dash or en dash as a separator. */
export function athleteVisibleCopy(text: string): string {
  return text.replace(/\s*[\u2013\u2014]\s*/g, ' · ');
}
