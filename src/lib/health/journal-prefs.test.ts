import { describe, expect, it } from 'vitest';
import {
  addCustomTrackable,
  defaultJournalPrefs,
  enabledAutoItemIds,
  parseJournalPrefs,
  setTrackableEnabled,
} from './journal-prefs';

describe('journal-prefs', () => {
  it('defaults to lean journal (metrics + prior night)', () => {
    const prefs = defaultJournalPrefs();
    expect(prefs.version).toBe(2);
    expect(prefs.enabled.metric_caffeine).toBe(true);
    expect(prefs.enabled.late_meal).toBe(true);
    expect(prefs.enabled.steps_10k).toBe(false);
    expect(prefs.enabled.alcohol).toBe(false);
    expect(enabledAutoItemIds(prefs)).toEqual([]);
    expect(prefs.customItems).toEqual([]);
  });

  it('merges v2 enabled map and migrates v1 sections', () => {
    const v2 = parseJournalPrefs({
      version: 2,
      enabled: { alcohol: true, steps_10k: true },
      customItems: [{ id: 'custom_abc123def456', label: 'Méditation', enabled: true }],
    });
    expect(v2.enabled.alcohol).toBe(true);
    expect(v2.enabled.steps_10k).toBe(true);
    expect(v2.enabled.metric_caffeine).toBe(true);
    expect(v2.customItems[0]?.label).toBe('Méditation');

    const v1 = parseJournalPrefs({
      version: 1,
      sections: { alcohol: true, auto_checklist: true, nutrition: true },
      lifestyle: { alcohol: true, sauna: true },
      autoItems: { steps_10k: true, nap: false },
      diet: { keto: true },
    });
    expect(v1.enabled.alcohol).toBe(true);
    expect(v1.enabled.sauna).toBe(true);
    expect(v1.enabled.steps_10k).toBe(true);
    expect(v1.enabled.nap).toBe(false);
    expect(v1.enabled.nutrition_panel).toBe(true);
    expect(v1.enabled.diet_keto).toBe(true);
  });

  it('toggles trackables and adds custom items', () => {
    let prefs = defaultJournalPrefs();
    prefs = setTrackableEnabled(prefs, 'creatine', true);
    expect(prefs.enabled.creatine).toBe(true);
    prefs = addCustomTrackable(prefs, 'Étirements');
    expect(prefs.customItems).toHaveLength(1);
    expect(prefs.customItems[0]?.label).toBe('Étirements');
    expect(prefs.customItems[0]?.enabled).toBe(true);
    expect(prefs.customItems[0]?.id.startsWith('custom_')).toBe(true);
  });
});
