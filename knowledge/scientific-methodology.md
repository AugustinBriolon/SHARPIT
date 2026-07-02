# Scientific Methodology

> How SHARPIT evaluates, applies, and evolves scientific knowledge.
> Every domain document in this knowledge base follows the standards defined here.

---

## Why SHARPIT Needs an Explicit Methodology

Sports science produces a continuous stream of new studies, many of which contradict earlier work. Thresholds that were considered gold standard five years ago are now debated. Models that are widely used in practice have limited peer-reviewed validation. Without an explicit methodology for evaluating evidence, SHARPIT would either:

1. Apply outdated models indefinitely (no mechanism to update)
2. Chase every new study and break scientific consistency
3. Apply rigorous academic standards that exclude useful practical tools

SHARPIT's methodology is designed to avoid all three failure modes.

---

## Evidence Hierarchy

SHARPIT evaluates evidence using a modified hierarchy adapted for applied sports science:

### Level 1 — Systematic reviews and meta-analyses

Population-level synthesis across multiple studies. Highest confidence in direction and magnitude of effect. Example: Malone et al. (2017) meta-analysis on ACWR and injury risk.

### Level 2 — Randomized controlled trials (RCTs) with adequate power

Controlled experimental evidence. Strong for mechanism; weaker for generalizability to trained endurance athletes (most RCTs use sedentary or recreationally active participants).

### Level 3 — Prospective observational studies in trained athletes

Evidence from athletes performing real training over real seasons. Ecologically valid but confounded. Example: Plews et al. (2013) on HRV in elite endurance athletes.

### Level 4 — Retrospective analysis and case series

Historical data analysis. Useful for hypothesis generation; not sufficient alone for threshold setting.

### Level 5 — Expert consensus and practitioner literature

Coaching manuals, sports scientist consensus statements, books from acknowledged practitioners (Coggan, Friel, Seiler, Bompa). High practical utility; lower formal validation. SHARPIT uses Level 5 evidence extensively because sports practice is often ahead of peer-reviewed publication.

### Level 6 — Proprietary algorithms (Garmin, Wahoo, Polar)

Vendor-computed values with unknown or unpublished methodology. Treated as instruments with uncertain accuracy. SHARPIT consumes these values but does not treat them as ground truth.

**Rule:** A model can be implemented on Level 5 evidence alone if it is widely adopted in practice and physiologically plausible. But it must be documented as Level 5 and flagged for future validation.

---

## How SHARPIT Assesses a New Model or Threshold

When evaluating whether to implement or modify a scientific model, SHARPIT asks five questions:

### 1. What is the evidence level?

Document the highest available evidence level for the model. Note whether evidence is from the target population (trained endurance/triathlon athletes) or extrapolated from a different population.

### 2. What is the practical utility?

A model is worth implementing if it produces actionable guidance. A statistically significant finding with no practical implications for training decisions is not worth the implementation complexity.

### 3. What are the known failure modes?

Every model has boundary conditions where it fails. SHARPIT documents them. Example: ACWR performs poorly after planned deload weeks (produces false positives). This limitation must be communicated when the model fires.

### 4. Does it conflict with existing SHARPIT models?

A new model that contradicts an existing model without resolving the conflict is not an improvement — it introduces incoherence. Before implementing, identify conflicts and either resolve them (with an ADR) or explicitly document the coexistence.

### 5. What is the cost of being wrong?

Models that influence injury risk assessment or health flags carry higher costs of being wrong. Conservative bias applies: when the evidence is uncertain, prefer the more conservative recommendation (rest > train, reduce > maintain).

---

## How SHARPIT Handles Conflicting Studies

Sports science has many areas of genuine scientific controversy:

- ACWR: initial studies showed strong injury prediction; later studies showed weak or inconsistent results
- Polarized training: strong evidence in elite athletes; mixed in recreational athletes
- HRV-guided training: promising but inconsistent across populations

SHARPIT's approach to conflicting evidence:

1. **Document the conflict explicitly** in the relevant domain file.
2. **Default to the consensus position** where one exists (even if contested). Do not take contrarian scientific positions without an ADR.
3. **Apply conservative interpretation** when evidence goes in both directions. If ACWR's predictive validity is contested, SHARPIT still flags high ACWR values — because the cost of ignoring a real risk signal is higher than the cost of a false positive.
4. **Do not present contested thresholds as precise or absolute** in the UI. Use language like "associated with elevated risk" rather than "causes injury."

---

## How Uncertainty is Handled

Every SHARPIT recommendation has an implicit confidence level based on:

- **Data completeness**: Is all required input data present?
- **Data recency**: Is the data fresh enough to be meaningful?
- **Model validity**: How well-validated is the underlying model?
- **Individual fit**: Does the model's population match this athlete?

When confidence is low, SHARPIT must:

1. Flag the missing data explicitly
2. Reduce the specificity of the recommendation ("consider rest" instead of "rest today")
3. Not produce a confident-sounding recommendation from weak data

See `confidence-scoring.md` for the implementation framework.

---

## How Models Are Replaced Over Time

SHARPIT must be able to update its models without requiring a full system rewrite. Protocol for model replacement:

1. **Propose the new model in an ADR** (in `knowledge/decisions/`). Document what it replaces, why, and the transition strategy.
2. **Run both models in parallel** during a validation period if the new model produces different outputs.
3. **Audit downstream effects**: changing a model may change alerts, recommendations, and AI coach behavior. These must be reviewed before deployment.
4. **Update the domain document**, the ADR, and the `architecture-links.md` file.
5. **Add a migration note** to the SCIENCE.md entry for the affected model.

**Principle:** backward compatibility in the UI is preferred. Athletes who have become familiar with a metric's meaning should not find its behavior changed without explanation.

---

## Scientific Debt

Scientific debt is the accumulation of models, thresholds, and interpretations that have not been validated or documented to the standard required by this methodology. It is tracked in `future-research.md`.

Current known scientific debt:

| Item                                    | Debt type                     | Risk                                       |
| --------------------------------------- | ----------------------------- | ------------------------------------------ |
| Garmin readiness thresholds (75/50)     | Empirically set, no source    | Incorrect classification of recovery state |
| Periodization load factors (0.85, 1.08) | No cited source               | Suboptimal training plan load distribution |
| Deload trigger (every 4 weeks, 72%)     | No cited source               | Deloads at wrong time or wrong magnitude   |
| LOAD_FACTOR per sport (TSS/min)         | Approximated                  | Incorrect load comparison across sports    |
| Sleep score thresholds (80/60)          | Garmin-derived, not validated | Incorrect interpretation of sleep quality  |
| Body battery thresholds (70/40)         | Empirical                     | Incorrect classification of readiness      |

---

## Language Standards for Scientific Claims

When writing recommendations, UI text, or AI coach responses, SHARPIT distinguishes between:

| Confidence                                      | Language to use                                               |
| ----------------------------------------------- | ------------------------------------------------------------- |
| High evidence (Level 1-2)                       | "Research shows...", "Evidence consistently indicates..."     |
| Moderate evidence (Level 3-4)                   | "Studies suggest...", "Evidence indicates..."                 |
| Low evidence / practitioner consensus (Level 5) | "Best practice suggests...", "Coaches typically recommend..." |
| Proprietary / unknown                           | "Garmin reports...", "Based on your wearable data..."         |
| Model estimate                                  | "SHARPIT estimates...", "Based on your training data..."      |

Never present a Level 5 or Level 6 finding using Level 1-2 language.

---

## Reference Standards

When citing a source in SHARPIT's knowledge base:

**Required format:**

```
Author(s) (Year). "Title." Journal/Book, Volume(Issue), pages.
```

**For implemented algorithms:** The source citation goes in the code as a comment, in the domain document, and in `references/[topic].md`.

**For threshold values:** The citation must accompany every use of the threshold (code comment, domain doc, glossary entry).

**For proprietary algorithms:** Note that the algorithm is proprietary, note the vendor and product version if known, and state that the underlying methodology is unavailable.

---

_This methodology applies to all scientific content in the SHARPIT knowledge base._
_Updates to this document require an ADR._
