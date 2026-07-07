# SHARPIT — Inference Models

> **Canonical index** for all inference model specifications.
> **Domain context:** [`docs/domain/DOMAIN.md`](../domain/DOMAIN.md)
> **Execution platform:** [`docs/engineering/INFERENCE_PLATFORM.md`](../engineering/INFERENCE_PLATFORM.md)
> **Scientific background:** [`knowledge/README.md`](../../knowledge/README.md)

---

## Reading order

Read models in dependency order — each model may consume outputs from those above it.

```
Training Stress (Tier 0)
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
        ▼
    Reasoning (synthesis)
```

---

## Model specifications

| Model           | Document                                               | Code                                  |
| --------------- | ------------------------------------------------------ | ------------------------------------- |
| Training Stress | [TRAINING_STRESS_MODEL.md](./TRAINING_STRESS_MODEL.md) | `src/core/inference/training-stress/` |
| Recovery        | [RECOVERY_MODEL.md](./RECOVERY_MODEL.md)               | `src/core/inference/recovery/`        |
| Fatigue         | [FATIGUE_MODEL.md](./FATIGUE_MODEL.md)                 | `src/core/inference/fatigue/`         |
| Adaptation      | [ADAPTATION_MODEL.md](./ADAPTATION_MODEL.md)           | `src/core/inference/adaptation/`      |
| Reasoning       | [REASONING_ENGINE.md](./REASONING_ENGINE.md)           | `src/core/inference/reasoning/`       |

---

## Architecture reviews

Point-in-time scientific reviews live in [`docs/audits/`](../audits/) — not model specs.

| Review                                                                              | Topic                                             |
| ----------------------------------------------------------------------------------- | ------------------------------------------------- |
| [ADAPTATION_ARCHITECTURE_REVIEW](../audits/ADAPTATION_ARCHITECTURE_REVIEW.md)       | Whether Adaptation should be an independent model |
| [INFERENCE_ARCHITECTURE_REVIEW](../audits/INFERENCE_ARCHITECTURE_REVIEW_2026-07.md) | Feature Extraction Layer gate review              |

---

## Rule

**Model behavior** → this folder. **Scientific background** → `knowledge/`. **Product law** → [`docs/product/PRODUCT.md`](../product/PRODUCT.md).
