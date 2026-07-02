# Paper Summary Template

Use this template to document key research papers that inform SHARPIT's models. Completed summaries live in `knowledge/references/`.

---

## Template

```markdown
# [Author(s) (Year)] — [Short Title]

**Full citation:** [Author(s) (Year). "Title." Journal, Volume(Issue), pages. DOI if available.]
**Evidence level:** [Level 1-6 per scientific-methodology.md]
**Population:** [Who was studied: sport, training level, age, N]
**Design:** [Study type: RCT, cohort, cross-sectional, meta-analysis, etc.]

---

## What They Found

[Key findings in 3-5 bullet points. Quantitative results where available.]

- Finding 1
- Finding 2
- Finding 3

## Limitations

[Methodological weaknesses, population constraints, conflicting evidence.]

## SHARPIT Application

[Specifically where this paper is used in SHARPIT and what it justifies. Reference the specific threshold, model, or algorithm.]

**Used in:** [file.ts function/constant]
**Justifies:** [the specific value or decision this paper supports]
**Limitations for SHARPIT:** [why this paper may not perfectly apply to SHARPIT's use case]

---

_Summary written: YYYY-MM-DD_
```

---

## Completed Summaries Index

| Paper                                        | SHARPIT use                    | File                          |
| -------------------------------------------- | ------------------------------ | ----------------------------- |
| Gabbett (2016) — ACWR and injury risk        | ACWR thresholds                | `references/training-load.md` |
| Coggan (2003) — PMC constants                | τ_ctl=42, τ_atl=7              | `references/training-load.md` |
| Walker (2017) — Why We Sleep                 | Sleep stage targets            | `references/sleep.md`         |
| Plews et al. (2013) — HRV monitoring         | HRV trend analysis             | `references/recovery.md`      |
| Buchheit (2014) — HRV in athletes            | 15% drop threshold             | `references/recovery.md`      |
| Van Dongen et al. (2003) — Sleep restriction | 390 min warning threshold      | `references/sleep.md`         |
| Phillips & Van Loon (2011) — Protein         | Hybrid athlete protein targets | `references/nutrition.md`     |
| Malone et al. (2017) — EWMA ACWR             | Future improvement basis       | `references/training-load.md` |
| Riegel (1977) — Running performance model    | Race time prediction           | `references/performance.md`   |
