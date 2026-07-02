import { describe, expect, it } from 'vitest';
import { computeAlerts } from './alerts';

const REF_DATE = new Date('2026-01-31T12:00:00');

describe('computeAlerts', () => {
  it('renvoie tableau vide si aucun signal problématique', () => {
    const alerts = computeAlerts({
      activities: [],
      health: [],
      physicalNotes: [],
      refDate: REF_DATE,
    });
    expect(alerts).toHaveLength(0);
  });

  describe('ACWR alerts', () => {
    it('alerte danger si ACWR >= 1.8', () => {
      // ACWR = 1.8 : charge aiguë très élevée vs chronique
      // 7j : 700 TSS, 42j : 700 + 5*350 = 2450, moyenne hebdo = 408
      // ACWR = 700/408 = 1.71 (proche, ajustons)
      // Pour ACWR >= 1.8 : besoin acuteLoad >= 1.8 * chronicAvg
      const activities = [
        ...Array.from({ length: 7 }, (_, i) => ({
          load: 110, // 7*110 = 770
          date: new Date(REF_DATE.getTime() - i * 24 * 3600 * 1000),
        })),
        ...Array.from({ length: 35 }, (_, i) => ({
          load: 50, // 5*7*50 = 1750
          date: new Date(REF_DATE.getTime() - (i + 7) * 24 * 3600 * 1000),
        })),
      ];
      // Total chronique = 770 + 1750 = 2520, avg hebdo = 420
      // ACWR = 770/420 = 1.83 ✅ danger

      const alerts = computeAlerts({
        activities,
        health: [],
        physicalNotes: [],
        refDate: REF_DATE,
      });
      const acwrAlert = alerts.find((a) => a.id === 'acwr-high');

      expect(acwrAlert).toBeDefined();
      expect(acwrAlert?.severity).toBe('danger');
      expect(acwrAlert?.title).toContain('Charge en zone de risque');
    });

    it('alerte warning si ACWR >= 1.5 et < 1.8', () => {
      // Acute : 7 × 100 = 700 | Chronic : 700 + 35 × 60 = 2800 | avg/6 = 466.67
      // ACWR = 700 / 466.67 = 1.50 ✅ warning (≥ 1.5 et < 1.8)
      const activities = [
        ...Array.from({ length: 7 }, (_, i) => ({
          load: 100,
          date: new Date(REF_DATE.getTime() - i * 24 * 3600 * 1000),
        })),
        ...Array.from({ length: 35 }, (_, i) => ({
          load: 60,
          date: new Date(REF_DATE.getTime() - (i + 7) * 24 * 3600 * 1000),
        })),
      ];

      const alerts = computeAlerts({
        activities,
        health: [],
        physicalNotes: [],
        refDate: REF_DATE,
      });
      const acwrAlert = alerts.find((a) => a.id === 'acwr-high');

      expect(acwrAlert).toBeDefined();
      expect(acwrAlert?.severity).toBe('warning');
    });

    it("pas d'alerte ACWR si 0.8 <= ACWR < 1.5", () => {
      // ACWR = 1.0 (équilibre)
      const activities = Array.from({ length: 42 }, (_, i) => ({
        load: 50,
        date: new Date(REF_DATE.getTime() - i * 24 * 3600 * 1000),
      }));

      const alerts = computeAlerts({
        activities,
        health: [],
        physicalNotes: [],
        refDate: REF_DATE,
      });
      const acwrHigh = alerts.find((a) => a.id === 'acwr-high');

      expect(acwrHigh).toBeUndefined();
    });

    it('alerte info si ACWR < 0.8 (sous-charge)', () => {
      // Dernière semaine très légère
      const activities = [
        ...Array.from({ length: 7 }, (_, i) => ({
          load: 20, // 140
          date: new Date(REF_DATE.getTime() - i * 24 * 3600 * 1000),
        })),
        ...Array.from({ length: 35 }, (_, i) => ({
          load: 60, // 2100
          date: new Date(REF_DATE.getTime() - (i + 7) * 24 * 3600 * 1000),
        })),
      ];
      // Total = 2240, avg = 373, ACWR = 140/373 = 0.38 ✅ sous-charge

      const alerts = computeAlerts({
        activities,
        health: [],
        physicalNotes: [],
        refDate: REF_DATE,
      });
      const acwrLow = alerts.find((a) => a.id === 'acwr-low');

      expect(acwrLow).toBeDefined();
      expect(acwrLow?.severity).toBe('info');
      expect(acwrLow?.title).toContain('Charge en baisse');
    });
  });

  describe('Readiness alerts', () => {
    it('alerte danger si readiness < 40 pendant 3+ jours consécutifs', () => {
      const health = [
        {
          date: REF_DATE,
          recoveryScore: 35,
          hrv: null,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
        {
          date: new Date(REF_DATE.getTime() - 1 * 24 * 3600 * 1000),
          recoveryScore: 38,
          hrv: null,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
        {
          date: new Date(REF_DATE.getTime() - 2 * 24 * 3600 * 1000),
          recoveryScore: 32,
          hrv: null,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
      ];

      const alerts = computeAlerts({ activities: [], health, physicalNotes: [] });
      const readinessAlert = alerts.find((a) => a.id === 'readiness-low-streak');

      expect(readinessAlert).toBeDefined();
      expect(readinessAlert?.severity).toBe('danger');
      expect(readinessAlert?.title).toContain("3 jours d'affilée");
    });

    it('alerte warning si readiness < 40 pendant 2 jours consécutifs', () => {
      const health = [
        {
          date: REF_DATE,
          recoveryScore: 38,
          hrv: null,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
        {
          date: new Date(REF_DATE.getTime() - 1 * 24 * 3600 * 1000),
          recoveryScore: 35,
          hrv: null,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
        {
          date: new Date(REF_DATE.getTime() - 2 * 24 * 3600 * 1000),
          recoveryScore: 60,
          hrv: null,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
      ];

      const alerts = computeAlerts({ activities: [], health, physicalNotes: [] });
      const readinessAlert = alerts.find((a) => a.id === 'readiness-low-streak');

      expect(readinessAlert).toBeDefined();
      expect(readinessAlert?.severity).toBe('warning');
    });

    it('alerte warning si readiness moyenne < 45 sur derniers jours', () => {
      const health = [
        {
          date: REF_DATE,
          recoveryScore: 42,
          hrv: null,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
        {
          date: new Date(REF_DATE.getTime() - 1 * 24 * 3600 * 1000),
          recoveryScore: 43,
          hrv: null,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
        {
          date: new Date(REF_DATE.getTime() - 2 * 24 * 3600 * 1000),
          recoveryScore: 44,
          hrv: null,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
      ];
      // Moyenne = 43 < 45 ✅

      const alerts = computeAlerts({ activities: [], health, physicalNotes: [] });
      const readinessAlert = alerts.find((a) => a.id === 'readiness-low-avg');

      expect(readinessAlert).toBeDefined();
      expect(readinessAlert?.severity).toBe('warning');
    });

    it("pas d'alerte readiness si score OK", () => {
      const health = [
        {
          date: REF_DATE,
          recoveryScore: 70,
          hrv: null,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
        {
          date: new Date(REF_DATE.getTime() - 1 * 24 * 3600 * 1000),
          recoveryScore: 65,
          hrv: null,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
      ];

      const alerts = computeAlerts({ activities: [], health, physicalNotes: [] });
      const readinessAlert = alerts.find((a) => a.id.startsWith('readiness'));

      expect(readinessAlert).toBeUndefined();
    });
  });

  describe('HRV alerts', () => {
    it('alerte si HRV status = UNBALANCED_LOW', () => {
      const health = [
        {
          date: REF_DATE,
          recoveryScore: null,
          hrv: 45,
          hrvStatus: 'UNBALANCED_LOW',
          restingHr: null,
          sleepMinutes: null,
        },
      ];

      const alerts = computeAlerts({ activities: [], health, physicalNotes: [] });
      const hrvAlert = alerts.find((a) => a.id === 'hrv-unbalanced');

      expect(hrvAlert).toBeDefined();
      expect(hrvAlert?.severity).toBe('warning');
      expect(hrvAlert?.title).toContain('HRV déséquilibrée');
    });

    it('alerte si HRV baisse >15% vs moyenne précédente', () => {
      const health = [
        {
          date: REF_DATE,
          recoveryScore: null,
          hrv: 40,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
        {
          date: new Date(REF_DATE.getTime() - 1 * 24 * 3600 * 1000),
          recoveryScore: null,
          hrv: 42,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
        {
          date: new Date(REF_DATE.getTime() - 2 * 24 * 3600 * 1000),
          recoveryScore: null,
          hrv: 41,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
        // Moyenne 3 derniers : 41
        {
          date: new Date(REF_DATE.getTime() - 3 * 24 * 3600 * 1000),
          recoveryScore: null,
          hrv: 55,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
        {
          date: new Date(REF_DATE.getTime() - 4 * 24 * 3600 * 1000),
          recoveryScore: null,
          hrv: 52,
          hrvStatus: null,
          restingHr: null,
          sleepMinutes: null,
        },
        // Moyenne précédente : ~53
        // 41 < 53*0.85 = 45.05 ✅ baisse >15%
      ];

      const alerts = computeAlerts({ activities: [], health, physicalNotes: [] });
      const hrvAlert = alerts.find((a) => a.id === 'hrv-drop');

      expect(hrvAlert).toBeDefined();
      expect(hrvAlert?.severity).toBe('warning');
    });
  });

  describe('FC repos alerts', () => {
    it('alerte si FC repos élevée +5 bpm vs baseline', () => {
      const health = [
        {
          date: REF_DATE,
          recoveryScore: null,
          hrv: null,
          hrvStatus: null,
          restingHr: 60,
          sleepMinutes: null,
        },
        {
          date: new Date(REF_DATE.getTime() - 1 * 24 * 3600 * 1000),
          recoveryScore: null,
          hrv: null,
          hrvStatus: null,
          restingHr: 61,
          sleepMinutes: null,
        },
        {
          date: new Date(REF_DATE.getTime() - 2 * 24 * 3600 * 1000),
          recoveryScore: null,
          hrv: null,
          hrvStatus: null,
          restingHr: 59,
          sleepMinutes: null,
        },
        // Moyenne récente = 60
        ...Array.from({ length: 10 }, (_, i) => ({
          date: new Date(REF_DATE.getTime() - (i + 3) * 24 * 3600 * 1000),
          recoveryScore: null,
          hrv: null,
          hrvStatus: null,
          restingHr: 54,
          sleepMinutes: null,
        })),
        // Baseline = 54, écart = 60-54 = 6 bpm ≥ 5 ✅
      ];

      const alerts = computeAlerts({ activities: [], health, physicalNotes: [] });
      const rhrAlert = alerts.find((a) => a.id === 'rhr-high');

      expect(rhrAlert).toBeDefined();
      expect(rhrAlert?.severity).toBe('warning');
      expect(rhrAlert?.title).toContain('FC de repos élevée');
    });
  });

  describe('Sommeil alerts', () => {
    it('alerte danger si sommeil moyen < 6h sur 7 jours', () => {
      const health = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(REF_DATE.getTime() - i * 24 * 3600 * 1000),
        recoveryScore: null,
        hrv: null,
        hrvStatus: null,
        restingHr: null,
        sleepMinutes: 350, // 5h50
      }));

      const alerts = computeAlerts({ activities: [], health, physicalNotes: [] });
      const sleepAlert = alerts.find((a) => a.id === 'sleep-debt');

      expect(sleepAlert).toBeDefined();
      expect(sleepAlert?.severity).toBe('danger');
      expect(sleepAlert?.title).toContain('Dette de sommeil');
    });

    it('alerte warning si sommeil moyen 6h-6h30 sur 7 jours', () => {
      const health = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(REF_DATE.getTime() - i * 24 * 3600 * 1000),
        recoveryScore: null,
        hrv: null,
        hrvStatus: null,
        restingHr: null,
        sleepMinutes: 380, // 6h20
      }));

      const alerts = computeAlerts({ activities: [], health, physicalNotes: [] });
      const sleepAlert = alerts.find((a) => a.id === 'sleep-debt');

      expect(sleepAlert).toBeDefined();
      expect(sleepAlert?.severity).toBe('warning');
    });

    it("pas d'alerte sommeil si moyenne >= 6h30", () => {
      const health = Array.from({ length: 7 }, (_, i) => ({
        date: new Date(REF_DATE.getTime() - i * 24 * 3600 * 1000),
        recoveryScore: null,
        hrv: null,
        hrvStatus: null,
        restingHr: null,
        sleepMinutes: 420, // 7h
      }));

      const alerts = computeAlerts({ activities: [], health, physicalNotes: [] });
      const sleepAlert = alerts.find((a) => a.id === 'sleep-debt');

      expect(sleepAlert).toBeUndefined();
    });
  });

  describe('Douleur/blessure alerts', () => {
    it('alerte danger si douleur sévérité >= 6', () => {
      const physicalNotes = [
        {
          title: 'Tendinite genou droit',
          severity: 7,
          status: 'ACTIVE',
          category: 'PAIN',
        },
      ];

      const alerts = computeAlerts({ activities: [], health: [], physicalNotes });
      const painAlert = alerts.find((a) => a.id === 'pain-severe');

      expect(painAlert).toBeDefined();
      expect(painAlert?.severity).toBe('danger');
      expect(painAlert?.title).toContain('Douleur');
    });

    it("pas d'alerte pour douleur résolue", () => {
      const physicalNotes = [
        {
          title: 'Ancienne douleur',
          severity: 8,
          status: 'RESOLVED',
          category: 'PAIN',
        },
      ];

      const alerts = computeAlerts({ activities: [], health: [], physicalNotes });
      const painAlert = alerts.find((a) => a.id === 'pain-severe');

      expect(painAlert).toBeUndefined();
    });

    it("pas d'alerte douleur pour problème mobilité/posture", () => {
      // Mobilité/posture n'est pas une douleur → pas d'alerte "pain-severe"
      const physicalNotes = [
        {
          title: 'Travail mobilité hanche',
          severity: 5,
          status: 'ACTIVE',
          category: 'MOBILITY',
        },
      ];

      const alerts = computeAlerts({ activities: [], health: [], physicalNotes });
      const painAlert = alerts.find((a) => a.id === 'pain-severe');

      // Pas d'alerte "pain" pour mobilité
      expect(painAlert).toBeUndefined();
    });
  });

  it('trie les alertes par sévérité (danger > warning > info)', () => {
    const activities = [
      ...Array.from({ length: 7 }, (_, i) => ({
        load: 110,
        date: new Date(REF_DATE.getTime() - i * 24 * 3600 * 1000),
      })),
      ...Array.from({ length: 35 }, (_, i) => ({
        load: 50,
        date: new Date(REF_DATE.getTime() - (i + 7) * 24 * 3600 * 1000),
      })),
    ];

    const health = [
      {
        date: REF_DATE,
        recoveryScore: 35,
        hrv: null,
        hrvStatus: null,
        restingHr: null,
        sleepMinutes: 350,
      },
      {
        date: new Date(REF_DATE.getTime() - 1 * 24 * 3600 * 1000),
        recoveryScore: 32,
        hrv: null,
        hrvStatus: null,
        restingHr: null,
        sleepMinutes: 340,
      },
      {
        date: new Date(REF_DATE.getTime() - 2 * 24 * 3600 * 1000),
        recoveryScore: 38,
        hrv: null,
        hrvStatus: null,
        restingHr: null,
        sleepMinutes: 360,
      },
    ];

    const physicalNotes = [
      {
        title: 'Blessure test',
        severity: 8,
        status: 'ACTIVE',
        category: 'INJURY',
      },
    ];

    const alerts = computeAlerts({ activities, health, physicalNotes });

    // Vérifier que les alertes "danger" viennent avant "warning" et "info"
    const severities = alerts.map((a) => a.severity);
    let lastRank = -1;
    const rankMap = { danger: 0, warning: 1, info: 2 };

    for (const sev of severities) {
      const rank = rankMap[sev];
      expect(rank).toBeGreaterThanOrEqual(lastRank);
      lastRank = rank;
    }
  });
});
