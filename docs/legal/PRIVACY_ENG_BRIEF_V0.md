# SHARPIT — Privacy eng brief V0

> **Status:** Engineering brief for Soft Eng Privacy mini. Locked with [`PRIVACY_MINI_V0.md`](./PRIVACY_MINI_V0.md) (2026-09-02).
> **Audience:** Engineers implementing consent fields, gates, export, delete.
> **Do not:** ship invite-only access; log credentials/body metrics; train general models on athlete data.

---

## 1. Consent / acceptance fields

Persist on the athlete (or equivalent athlete-scoped store). Timestamps are ISO datetimes when accepted; `null` = not accepted.

| Field                         | Type             | Meaning                                                                            |
| ----------------------------- | ---------------- | ---------------------------------------------------------------------------------- |
| `terms_accepted_at`           | datetime \| null | Athlete accepted CGU (`/terms`)                                                    |
| `privacy_accepted_at`         | datetime \| null | Athlete accepted privacy policy (`/privacy`)                                       |
| `privacy_version`             | string \| null   | Version id of the privacy text accepted (bump when copy changes materially)        |
| `health_data_consent_at`      | datetime \| null | Explicit consent to process Art. 9 health data (sync + inferences)                 |
| `ai_processing_consent_at`    | datetime \| null | Explicit consent for LLM / AI processing of athlete context — **hard gate**        |
| `unofficial_providers_ack_at` | datetime \| null | Acknowledgement that unofficial integrations are as-is / unsupported by the vendor |

Withdrawal: clearing a consent timestamp must immediately re-apply the corresponding gate (disconnect or block the path). Soft Eng defines UX; eng enforces server-side.

---

## 2. Gates

| Action                                                                                    | Required fields                                                                             | Failure behaviour                                                                                                          |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Use app after signup / onboarding continue (soft wall `/consent` → Today)                 | `terms_accepted_at`, `privacy_accepted_at`, `privacy_version`, **`health_data_consent_at`** | Block until accepted. Health consent is **required** (Art. 9) — same gate as CGU/Privacy. AI remains optional on the wall. |
| Connect provider feeding health / body / wearable / nutrition classes                     | `health_data_consent_at`                                                                    | Block connect / sync start                                                                                                 |
| Legacy santé exposure (providers linked **or** health rows already in DB) without consent | `health_data_consent_at`                                                                    | Force soft wall until granted                                                                                              |
| Connect **unofficial** provider                                                           | `unofficial_providers_ack_at` (+ health consent if health classes)                          | Block connect                                                                                                              |
| LLM briefing, Coach AI, any path that sends athlete context to an LLM                     | `ai_processing_consent_at`                                                                  | **Hard block** — deterministic engines OK without AI consent                                                               |
| Export personal data                                                                      | Authenticated athlete                                                                       | Return JSON export                                                                                                         |
| Delete account                                                                            | Authenticated athlete                                                                       | Soft-delete now; schedule **purge at J+30**                                                                                |

### Rules of thumb

- **Deterministic Core / inference engines** do not require `ai_processing_consent_at`.
- **Any LLM call** with athlete-derived context does.
- Health sync without `health_data_consent_at` must not start (including cron/background sync for that athlete).
- Do not treat « cercle privé » as a code gate — classic Clerk signup remains open.

---

## 3. Export (P4)

- Format: **JSON**.
- Scope: athlete-owned personal data Sharpit holds (profile, consents, synced observations Sharpit stored, inferences/snapshots as stored, account metadata).
- Exclude: other athletes, secrets (provider tokens — export connection metadata only, not raw credentials), internal ops logs.
- Delivery: authenticated download or equivalent athlete-initiated path.

Exact schema is Soft Eng’s to define; must be athlete-scoped and complete enough for GDPR access/portability intent.

---

## 4. Delete (P5)

1. Athlete requests deletion.
2. **Soft-delete** immediately (account unusable; data retained for recovery / legal window).
3. **Hard purge at J+30** (including provider tokens, snapshots, inferences, consents).
4. Coordinate Clerk user deletion with DB purge so no orphaned auth identity remains after purge.

---

## 5. Logging / telemetry

- **Never** log: passwords, OAuth tokens, cookies, API keys, body metrics (weight, fat %, HR series dumps, etc.).
- Prefer ids + event names; redact integration payloads in error reports.

---

## 6. Disclaimers to surface (product copy)

**Health (Science Sport — verbatim):**

> Sharpit est un outil d’aide à l’entraînement. Ce n’est pas un dispositif médical et ça ne remplace pas un avis médical. Les signaux (récupération, fatigue, risques) sont des estimations d’entraînement, pas un diagnostic.

**Unofficial integrations:** short ack that the integration is unofficial / as-is, may break, and is not endorsed by the provider — recorded via `unofficial_providers_ack_at`.

---

## 7. QA checklist

- [ ] New signup cannot proceed without terms + privacy accept (version stored) **and** `health_data_consent_at` (soft wall before Today).
- [ ] Athletes with santé providers linked or health rows in DB without health consent are forced back to `/consent`.
- [ ] Provider connect for health classes blocked without `health_data_consent_at`.
- [ ] Unofficial provider connect blocked without `unofficial_providers_ack_at`.
- [ ] LLM / Coach AI returns gated error without `ai_processing_consent_at`; deterministic Today/inference still works.
- [ ] Cron/background sync skips athletes lacking health consent for health classes.
- [ ] Export returns athlete-scoped JSON; no raw credentials.
- [ ] Delete soft-hides account **and clears provider Enc credentials immediately**; purge job removes data at J+30 (or dry-run proves schedule).
- [ ] No credentials / body metrics in app logs for consent/connect/export/delete paths.
- [ ] `/privacy` and `/terms` render FR drafts; no « sur invitation uniquement » / invite-only wording.
- [ ] Privacy contact shown: `augustin.briolon@gmail.com`.

---

## 8. Out of scope (Privacy mini V0)

- Invite codes / allow-list as product lock
- English legal pages
- Formal DPO / full DPIA package beyond this mini
- Renegotiating third-party DPAs in this PR
- Medical-device certification language
- Using athlete data to train general-purpose models
- App route / consent UI in the **docs** PR (implementation = Soft Eng follow-up)
