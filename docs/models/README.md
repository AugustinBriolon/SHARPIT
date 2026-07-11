# SHARPIT — Inference Models

> **Canonical index** for all inference model specifications.  
> **Architectural constitution:** [`CORE_ARCHITECTURE.md`](./CORE_ARCHITECTURE.md) — frozen Core, stabilization phase  
> **Domain context:** [`docs/domain/DOMAIN.md`](../domain/DOMAIN.md)  
> **Execution platform:** [`docs/engineering/INFERENCE_PLATFORM.md`](../engineering/INFERENCE_PLATFORM.md)  
> **Scientific background:** [`knowledge/README.md`](../../knowledge/README.md)

---

## Reading order

Read models in dependency order — each model may consume outputs from those above it.

```
Training Stress (Tier 0 — features)
        │
        ▼
    Recovery (Tier 1)
        │
        ▼
     Fatigue (Tier 2)
        │
        ▼
   Adaptation (Tier 3)
        │
   Physical Health · Environment (parallel dimensions)
        │
        ▼
  Decision Engine (canonical product arbitration)
        │
        ▼
  Reasoning (legacy projection — do not extend)
```

---

## Model specifications

| Model                 | Document                                                             | Code                                  | Status              |
| --------------------- | -------------------------------------------------------------------- | ------------------------------------- | ------------------- |
| **Core Architecture** | [CORE_ARCHITECTURE.md](./CORE_ARCHITECTURE.md)                       | —                                     | CORE (frozen)       |
| Training Stress       | [TRAINING_STRESS_MODEL.md](./TRAINING_STRESS_MODEL.md)               | `src/core/inference/training-stress/` | CORE                |
| Recovery              | [RECOVERY_MODEL.md](./RECOVERY_MODEL.md)                             | `src/core/inference/recovery/`        | CORE                |
| Fatigue               | [FATIGUE_MODEL.md](./FATIGUE_MODEL.md)                               | `src/core/inference/fatigue/`         | CORE                |
| Adaptation            | [ADAPTATION_MODEL.md](./ADAPTATION_MODEL.md)                         | `src/core/inference/adaptation/`      | CORE                |
| Decision              | [DECISION_ENGINE.md](./DECISION_ENGINE.md)                           | `src/core/decision/`                  | CORE                |
| Reasoning             | [REASONING_ENGINE.md](./REASONING_ENGINE.md)                         | `src/core/inference/reasoning/`       | STABLE (projection) |
| Physical Health       | [PHYSICAL_HEALTH_ENGINE.md](./PHYSICAL_HEALTH_ENGINE.md)             | `src/core/inference/physical-health/` | CORE                |
| Environment           | [ENVIRONMENTAL_CONTEXT_ENGINE.md](./ENVIRONMENTAL_CONTEXT_ENGINE.md) | `src/core/environment/`               | CORE                |

---

## Architecture reviews

Point-in-time scientific reviews live in [`docs/audits/`](../audits/) — not model specs.

| Review                                                                              | Topic                                                |
| ----------------------------------------------------------------------------------- | ---------------------------------------------------- |
| [STABILIZATION_P0_MIGRATION_REPORT.md](./STABILIZATION_P0_MIGRATION_REPORT.md)      | Sprint 1 P0 — single decision pipeline migration     |
| [STABILIZATION_P1_REPORT.md](./STABILIZATION_P1_REPORT.md)                          | Sprint 2 P1 — drill-downs, useToday, Reasoning audit |
| [STABILIZATION_P2_REPORT.md](./STABILIZATION_P2_REPORT.md)                          | Sprint 3 P2 — legacy removal, guards, repo hygiene   |
| [ADAPTATION_ARCHITECTURE_REVIEW](../audits/ADAPTATION_ARCHITECTURE_REVIEW.md)       | Whether Adaptation should be an independent model    |
| [INFERENCE_ARCHITECTURE_REVIEW](../audits/INFERENCE_ARCHITECTURE_REVIEW_2026-07.md) | Feature Extraction Layer gate review                 |

---

## Rule

**Architectural law** → [`CORE_ARCHITECTURE.md`](./CORE_ARCHITECTURE.md). **Model behavior** → this folder. **Scientific background** → `knowledge/`. **Product law** → [`docs/product/PRODUCT.md`](../product/PRODUCT.md).

**Stabilization phase:** no new core engines. Build vertically on frozen intelligence.
