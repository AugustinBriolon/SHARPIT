# Food health score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Compute a Sharpit 0–100 food health score from Open Food Facts (and partial custom foods) and show it on iOS wherever a product appears.

**Architecture:** Pure formula in `@sharpit/app`; server persists `FoodProduct.health` when caching OFF / saving custom foods; v1 JSON carries `health`; iOS decodes and renders badge + detail.

**Tech Stack:** TypeScript (packages/app + server), Prisma/Postgres, SwiftUI iOS.

## Global Constraints

- English in code/docs/commits; athlete-facing copy in French.
- Attribution « Données Open Food Facts (ODbL) » unchanged where OFF products show.
- Disclaimer: « Indicateur Sharpit, pas un avis médical ».
- iOS first; do not build web UI in this plan.
- No medical claims beyond the indicator wording.

---

## File map

| File                                           | Responsibility                                 |
| ---------------------------------------------- | ---------------------------------------------- |
| `packages/app/.../food-health-score.ts`        | Formula + types + EU level thresholds          |
| `packages/app/.../additives-risk.ts`           | E-code → risk + French name                    |
| `packages/app/.../open-food-facts.ts`          | Extra OFF fields → mapped food + health inputs |
| `packages/db/prisma/schema.prisma` + migration | `saltPer100g`, `saturatedFatPer100g`, `health` |
| `packages/server/.../food-log-service.ts`      | Persist health; refresh on scoreVersion        |
| `packages/app/.../validators/food-log.ts`      | Optional salt/sat fat on custom foods          |
| `SHARPIT-APP/.../V1FoodLog.swift`              | Decode `health`                                |
| `SHARPIT-APP/.../FoodHealth*.swift`            | Badge + detail views                           |
| Existing nutrition Swift views                 | Wire badge/detail                              |

---

### Task 1: Score formula + additives table (TDD)

- [ ] Write failing tests for Nutri-Score mapping, NOVA, additives penalties, partial custom, null coverage
- [ ] Implement `food-health-score.ts` + `additives-risk.ts`
- [ ] Run `yarn vitest` in packages/app — pass

### Task 2: OFF mapping + persistence

- [ ] Extend `OFF_FIELDS` / `mapOffProduct` (tests first)
- [ ] Prisma migration for salt, saturated fat, health
- [ ] Wire `food-log-service` create/upsert/update to compute and store health; refresh when scoreVersion stale
- [ ] Extend custom food validators + service
- [ ] Server tests green

### Task 3: iOS models + UI

- [ ] `V1FoodHealth` on `V1FoodProduct`
- [ ] `FoodHealthBadge` + `FoodHealthDetail`
- [ ] Wire into product row, portion page, entry rows, own-food sheet
- [ ] Unit tests for decoding / grade labels where the project already tests networking models
