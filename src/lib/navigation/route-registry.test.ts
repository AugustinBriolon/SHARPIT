import { describe, expect, it } from 'vitest';
import {
  isTransientRoute,
  resolveRouteFallback,
  resolveRouteLabel,
} from './route-registry';

describe('route-registry', () => {
  describe('resolveRouteLabel', () => {
    it('matches Shell V1 hubs and static routes', () => {
      expect(resolveRouteLabel('/plan')).toBe('Plan');
      expect(resolveRouteLabel('/activite')).toBe('Activité');
      expect(resolveRouteLabel('/moi')).toBe('Moi');
      expect(resolveRouteLabel('/training')).toBe('Fil de la semaine');
      expect(resolveRouteLabel('/training/history')).toBe('Historique');
      expect(resolveRouteLabel('/settings')).toBe('Moi');
      expect(resolveRouteLabel('/settings/privacy')).toBe('Confidentialité');
      expect(resolveRouteLabel('/coach')).toBe('Coach');
      expect(resolveRouteLabel('/')).toBe('Today');
    });

    it('matches dynamic segments', () => {
      expect(resolveRouteLabel('/training/abc123')).toBe('Séance');
      expect(resolveRouteLabel('/training/abc123/edit')).toBe('Édition');
    });

    it('ignores search / hash when matching', () => {
      expect(resolveRouteLabel('/training/history?tab=running')).toBe('Historique');
      expect(resolveRouteLabel('/progress?tab=performance')).toBe('Progression');
    });

    it('falls back to a generic label for unknown routes', () => {
      expect(resolveRouteLabel('/unknown/path')).toBe('Retour');
    });
  });

  describe('isTransientRoute', () => {
    it('marks activity edit as transient (skipped by the nav stack)', () => {
      expect(isTransientRoute('/training/abc123/edit')).toBe(true);
      expect(isTransientRoute('/training/abc123/edit?x=1')).toBe(true);
    });

    it('does not mark activity detail or other training routes as transient', () => {
      expect(isTransientRoute('/training/abc123')).toBe(false);
      expect(isTransientRoute('/training/history')).toBe(false);
      expect(isTransientRoute('/training/manual')).toBe(false);
    });
  });

  describe('resolveRouteFallback', () => {
    it('returns the direct parent for detail routes', () => {
      expect(resolveRouteFallback('/training/abc123')).toEqual({
        href: '/training/history',
        label: 'Historique',
      });
      expect(resolveRouteFallback('/training/history')).toEqual({
        href: '/activite',
        label: 'Activité',
      });
      expect(resolveRouteFallback('/training')).toEqual({
        href: '/plan',
        label: 'Plan',
      });
      expect(resolveRouteFallback('/training/planning')).toEqual({
        href: '/plan',
        label: 'Plan',
      });
    });

    it('resolves edit page fallback back to its parent detail', () => {
      expect(resolveRouteFallback('/training/session-42/edit')).toEqual({
        href: '/training/session-42',
        label: 'Séance',
      });
    });

    it('sends every /settings child back to /moi', () => {
      expect(resolveRouteFallback('/settings/account')).toEqual({
        href: '/moi',
        label: 'Moi',
      });
      expect(resolveRouteFallback('/settings/integrations')).toEqual({
        href: '/moi',
        label: 'Moi',
      });
      expect(resolveRouteFallback('/settings/equipment')).toEqual({
        href: '/moi',
        label: 'Moi',
      });
      expect(resolveRouteFallback('/settings/privacy')).toEqual({
        href: '/moi',
        label: 'Moi',
      });
    });

    it('sends /today/* drill-downs back to home', () => {
      expect(resolveRouteFallback('/today/recovery')).toEqual({
        href: '/',
        label: 'Today',
      });
      expect(resolveRouteFallback('/today/sleep')).toEqual({
        href: '/',
        label: 'Today',
      });
    });

    it('defaults to home when no matcher applies', () => {
      expect(resolveRouteFallback('/unknown')).toEqual({ href: '/', label: 'Today' });
    });
  });
});
