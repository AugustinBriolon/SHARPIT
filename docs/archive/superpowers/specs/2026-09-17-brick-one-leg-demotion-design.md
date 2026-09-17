# Brick one-leg demotion — design

## Product lock

A **brick** is exactly two chained disciplines. Removing one leg demotes the remainder to a **simple session** and clears brick metadata entirely (no half-brick label).

## Approach (minimal)

1. **Write path:** `deletePlannedSession` clears `brickGroupId` / `brickOrder` on remaining siblings when fewer than 2 legs remain, and deletes `BrickAnalysis` for that group (athlete-scoped).
2. **Read path (defense):** `groupPlannedSessions` / `groupThreadDayEntries` treat a group with < 2 legs as singles so orphaned metadata cannot keep a Brick tag.
3. **Optimistic UI:** planned-session remove clears brick fields on the surviving sibling in cache.
4. **Coach cache:** after coach session/plan mutations, also invalidate Today presentation + `trainingPlan` (current athlete client cache only; consent walls untouched).

## Out of scope

Multi-leg brick science beyond demotion; consent/health gates; forcing create schema to `exactly 2` (already `min 2`).
