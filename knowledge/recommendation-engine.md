# Recommendation Engine

> How SHARPIT generates recommendations: the logic pipeline, signal hierarchy, and behavioral rules that produce every output the athlete sees.

---

## What the Recommendation Engine Is

The recommendation engine is not a single function. It is the collection of logic distributed across:

- `src/lib/dashboard.ts` — `buildTrainingVerdict()`
- `src/lib/recovery.ts` — `buildReadinessView()`, `buildFormView()`
- `src/lib/sleep.ts` — `analyzeSleep()`
- `src/lib/alerts.ts` — `computeAlerts()`
- `src/lib/periodization.ts` — `getPeriodizationPhase()`
- AI coach generation (server-side prompt construction)

These components run independently and are assembled in the dashboard and daily briefing views.

---

## Signal Priority Hierarchy

When multiple signals are present, SHARPIT applies a strict priority order. Higher-priority signals can override lower-priority outputs.

```
1. Active injury (severity ≥ 6)
   → Overrides everything: "Rest mandatory due to reported injury"

2. ACWR danger zone (≥ 1.8)
   → Overrides training recommendation: "Load reduction required"

3. ACWR warning zone (≥ 1.5)
   → Adds caution context to training recommendation

4. Readiness state (Garmin readiness + HRV)
   → Drives primary recommendation tone

5. Sleep debt (7-day average)
   → Modifies recommendation if poor

6. TSB state
   → Context for recommendation depth

7. Periodization phase
   → Frames expectation (BUILD expects high load, TAPER expects low)
```

**The hierarchy principle:** physiological safety signals override load-derived signals. An athlete with excellent TSB and poor readiness should not receive an aggressive training recommendation.

---

## Training Verdict Logic

`buildTrainingVerdict()` in `dashboard.ts` produces the primary daily recommendation.

### Input signals

- `readiness` → from `buildReadinessView()`
- `form` (TSB) → from `buildFormView()`
- `acwr` → from `computeTrainingLoad()`
- `activeAlerts` → from `computeAlerts()`
- `sleepAnalysis` → from `analyzeSleep()`
- `periodizationPhase` → from `getPeriodizationPhase()`

### Output structure

```typescript
{
  tone: 'good' | 'moderate' | 'low',
  headline: string,      // "Bien récupéré : séance intense possible"
  detail: string,        // supporting context
  recommendation: string // specific session type recommendation
}
```

### Decision matrix

| Readiness | ACWR | Sleep       | TSB  | Verdict                          |
| --------- | ---- | ----------- | ---- | -------------------------------- |
| ≥75       | <1.5 | ≥390min avg | >-20 | `good` — séance intense possible |
| ≥75       | ≥1.5 | any         | any  | `moderate` — ACWR override       |
| 50-75     | any  | any         | any  | `moderate` — Z2 ou technique     |
| <50       | any  | any         | any  | `low` — repos actif              |
| any       | any  | <360min avg | any  | `low` modifier — sleep debt      |

The decision matrix above is simplified. The actual implementation weighs multiple factors. When signals conflict, the more conservative output wins.

---

## Alert Generation

`computeAlerts()` in `alerts.ts` generates `Alert[]` with:

- `type`: category (ACWR, HRV, SLEEP, etc.)
- `severity`: 'info' | 'warning' | 'danger'
- `message`: display text
- `detail`: expanded explanation

**Alert thresholds (reference to source documents):**

| Alert                  | Threshold                       | Source                        |
| ---------------------- | ------------------------------- | ----------------------------- |
| HRV trend decline      | 3-day avg < 4-10 day avg × 0.85 | Buchheit (2014), Plews (2013) |
| RHR elevation          | 3-day avg ≥ 14-day avg + 5 bpm  | Friel (2009), Noakes (1991)   |
| ACWR warning           | ≥ 1.5                           | Gabbett (2016)                |
| ACWR danger            | ≥ 1.8                           | Carey et al. (2017)           |
| Sleep duration warning | 7-day avg < 390 min             | Van Dongen et al. (2003)      |
| Sleep duration danger  | 7-day avg < 360 min             | Severe restriction            |
| Nocturnal stress       | avg stress during sleep > 30    | Empirical                     |
| Low readiness          | < 50                            | Empirical (Garmin scale)      |

**Alert generation rules:**

1. Each alert type fires at most once per day
2. `danger` severity alerts are shown before `warning`
3. An alert in `danger` always surfaces in the dashboard, regardless of other positive signals
4. Positive signals do not suppress alerts — they coexist

---

## Sleep Insights Engine

`analyzeSleep()` generates up to 4 insights from the priority list:

1. Duration deficit (7-day average below target)
2. Bedtime vs goal (athlete's actual vs. SHARPIT recommended bedtime)
3. Deep sleep deficit
4. REM deficit
5. Bedtime regularity (MAD > 60 min)
6. Bedtime vs computed recommended
7. Nocturnal stress elevated
8. Summary positive (no issues found)

**Rules:**

- Maximum 4 insights per call
- Item 8 fires only when items 1-7 are all absent
- Each insight includes: `insight` (label), `detail` (explanation), `tone` (good/moderate/low)

---

## AI Coach Integration

The AI coach receives:

- Current training verdict
- Active alerts
- Sleep analysis
- PMC state (CTL, ATL, TSB)
- ACWR
- Periodization phase
- Recent activities (last 7-14 days)
- Athlete profile (FTP, LTHR, goals, injury history)
- Full conversation history

The AI coach uses the recommendation engine outputs as context, but is not bound by them. It can produce nuanced recommendations that the deterministic engine cannot. For example:

- "Your ACWR is 1.4 (elevated) but this is day 2 of a normal training block following your rest week, so this spike is expected."
- "Your readiness is 62 (moderate) but your sleep has been consistently good this week, so the moderate readiness may reflect yesterday's hard session, not true under-recovery."

**The AI coach must not contradict SHARPIT's health-safety rules.** When injury alerts (severity ≥6) are active, the AI coach must recommend rest. This is an inviolable rule. See `product-constitution.md`.

---

## Recommendation Language Standards

### Tone vocabulary

| Tone       | French recommendations                          | English equivalent       |
| ---------- | ----------------------------------------------- | ------------------------ |
| `good`     | "Séance intense possible", "Bien récupéré"      | Intense session possible |
| `moderate` | "Privilégie Z2 ou technique", "Modère l'effort" | Zone 2 or technique work |
| `low`      | "Repos actif recommandé", "Journée off"         | Active rest or day off   |

### What SHARPIT does NOT say

- Specific session content (e.g., "do 5×5 min at FTP") — this is the AI coach's domain
- Caloric or weight targets — see product-constitution ethical constraints
- Medical diagnoses — SHARPIT flags patterns; it does not diagnose

### Confidence modulation language

When confidence is low (insufficient data, conflicting signals):

- "Based on limited data, ..."
- "Your recent data suggests..."
- "SHARPIT estimates..."

Never: "You are definitely overtrained" or "Your recovery is scientifically confirmed as excellent."

---

## Periodization Context

Recommendations are contextualized by periodization phase. The same readiness score means different things in different phases:

| Phase | Expected TSB                  | Expected ATL | Recommendation adjustment                     |
| ----- | ----------------------------- | ------------ | --------------------------------------------- |
| BASE  | Slightly negative             | Building     | Accept moderate TSB decline                   |
| BUILD | Negative                      | High         | High ATL is normal; watch readiness           |
| PEAK  | Negative to slightly negative | High         | Maintain intensity despite fatigue            |
| TAPER | Rising toward 0/positive      | Falling      | Moderate readiness drop is OK; freshening     |
| RACE  | Positive                      | Low          | If readiness is still low, flag as concerning |

This context prevents the system from recommending rest during a planned high-load BUILD week solely because TSB is -20.

---

## Known Limitations

1. **No learning from outcome.** SHARPIT cannot learn whether its recommendations were followed or effective. A recommendation for "Z2 only" followed by a hard session with excellent performance does not update the model.

2. **No multi-day trajectory.** Recommendations are point-in-time. SHARPIT cannot say "today rest, tomorrow hard session, day after easy" as a coherent forward plan.

3. **No session type specificity.** "Séance intense" is not a workout. The deterministic engine cannot prescribe intervals, tempo runs, or sport-specific content. This gap is partially filled by the AI coach.

4. **Single athlete optimization.** SHARPIT does not know about events, social commitments, or travel that affect training availability. The AI coach can incorporate this conversationally.

5. **Cold start conservatism.** New users with insufficient history receive conservative recommendations (more moderate/low verdicts) because data quality is low. This is correct behavior but may frustrate experienced athletes who see weak recommendations.
