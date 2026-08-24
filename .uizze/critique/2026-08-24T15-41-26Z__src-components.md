---
target: src/components
total_score: 26
max_score: 40
na_heuristics:
p0_count: 3
p1_count: 4
timestamp: 2026-08-24T15-41-26Z
slug: src-components
---

# Critique SHARPIT frontend (src/components)

Method: dual-agent (A: visual critique · B: grep detector). Degraded detector: detect.mjs missing. No browser overlay.

Design health: 26/40 (Acceptable). UI Slop Score: 46/100.

## Heuristics

1 Visibility 3 · 2 Match world 3 · 3 Control 3 · 4 Consistency 2 · 5 Prevention 3 · 6 Recognition 2 · 7 Flexibility 3 · 8 Minimal 2 · 9 Recovery 3 · 10 Help 2

## Specificity

Morning plate + training thread are authored for SHARPIT. Coach, Progress tabs, Today below-fold (streak heatmap, calorie ring) are category-interchangeable.

## P0

- Today causal column broken (heatmap + nutrition in first scroll)
- Streak counter + contribution graph (named anti-pattern)
- CalorieRing progress ring

## P1

- Forest plate identical for PUSH and RECOVER
- Coach ChatGPT chrome + "modele IA" copy
- Sparkles/Wand2 (18 hits)
- Progress hub equal tabs (forbidden by DESIGN_LANGUAGE)

## P2

- highlight CTA rounded-full pills
- ~48 em dashes in athlete copy
- 43 reinvented uppercase eyebrows

## Clean

No Inter/Geist, no purple, no SaaS bg-card plates, no CountUp, no Great job copy.
Lucide is the incumbent icon family (do not migrate).
