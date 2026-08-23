import { describe, expect, it } from 'vitest';
import { resolveRouteFallback, resolveRouteLabel } from './route-registry';

describe('route-registry', () => {
  describe('resolveRouteLabel', () => {
    it('matches static routes', () => {
      expect(resolveRouteLabel('/training')).toBe('Ma semaine');
      expect(resolveRouteLabel('/training/history')).toBe('Historique');
      expect(resolveRouteLabel('/settings')).toBe('Profil');
      expect(resolveRouteLabel('/coach')).toBe('Coach');
      expect(resolveRouteLabel('/')).toBe('Aujourd’hui');
    });

    it('matches dynamic segments', () => {
      expect(resolveRouteLabel('/training/abc123')).toBe('Séance');
      expect(resolveRouteLabel('/training/abc123/edit')).toBe('Édition');
    });

    it('ignores search / hash when matching', () => {
      expect(resolveRouteLabel('/training/history?tab=running')).toBe('Historique');
      expect(resolveRouteLabel('/settings/calibration#ftp')).toBe('Seuils & repères');
    });

    it('falls back to a generic label for unknown routes', () => {
      expect(resolveRouteLabel('/unknown/path')).toBe('Retour');
    });
  });

  describe('resolveRouteFallback', () => {
    it('returns the direct parent for detail routes', () => {
      expect(resolveRouteFallback('/training/abc123')).toEqual({
        href: '/training/history',
        label: 'Historique',
      });
      expect(resolveRouteFallback('/training/history')).toEqual({
        href: '/training',
        label: 'Ma semaine',
      });
    });

    it('resolves edit page fallback back to its parent detail', () => {
      expect(resolveRouteFallback('/training/session-42/edit')).toEqual({
        href: '/training/session-42',
        label: 'Séance',
      });
    });

    it('sends every /settings child back to /settings', () => {
      expect(resolveRouteFallback('/settings/account')).toEqual({
        href: '/settings',
        label: 'Profil',
      });
      expect(resolveRouteFallback('/settings/integrations')).toEqual({
        href: '/settings',
        label: 'Profil',
      });
      expect(resolveRouteFallback('/settings/equipment')).toEqual({
        href: '/settings',
        label: 'Profil',
      });
    });

    it('sends /today/* drill-downs back to home', () => {
      expect(resolveRouteFallback('/today/recovery')).toEqual({
        href: '/',
        label: 'Aujourd’hui',
      });
      expect(resolveRouteFallback('/today/sleep')).toEqual({
        href: '/',
        label: 'Aujourd’hui',
      });
    });

    it('defaults to home when no matcher applies', () => {
      expect(resolveRouteFallback('/unknown')).toEqual({ href: '/', label: 'Aujourd’hui' });
    });
  });
});
