import { describe, expect, it } from 'vitest';
import { formatPlannedSessionLocationDisplay } from './planned-session-display';

describe('formatPlannedSessionLocationDisplay', () => {
  it('returns exposure only when location is null', () => {
    expect(formatPlannedSessionLocationDisplay(null, 'À confirmer')).toBe('À confirmer');
  });

  it('never renders the string null', () => {
    expect(formatPlannedSessionLocationDisplay('null', 'À confirmer')).toBe('À confirmer');
  });

  it('joins label and exposure when label is present', () => {
    expect(formatPlannedSessionLocationDisplay('Colombes, France', 'Extérieur')).toBe(
      'Colombes, France · Extérieur',
    );
  });

  it('treats blank labels as missing', () => {
    expect(formatPlannedSessionLocationDisplay('   ', 'Intérieur')).toBe('Intérieur');
  });
});
