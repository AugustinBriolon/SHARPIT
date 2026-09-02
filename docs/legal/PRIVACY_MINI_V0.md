# SHARPIT — Privacy mini V0

> **Status:** Operational brief (locked decisions 2026-09-02). Docs only — no routes/UI in this PR.
> **Audience:** Eng / sec / product. Actionable gates for Soft Eng Privacy mini implementation.
> **Legal language:** FR only (page drafts: [`PRIVACY_PAGE_FR_V0.md`](./PRIVACY_PAGE_FR_V0.md), [`TERMS_PAGE_FR_V0.md`](./TERMS_PAGE_FR_V0.md)).
> **Eng gates detail:** [`PRIVACY_ENG_BRIEF_V0.md`](./PRIVACY_ENG_BRIEF_V0.md).

---

## 1. Cadre (art. 9)

Treat **physiological observations** (wearable / body / nutrition sync) and **inferences derived from them** (récupération, fatigue, risques, etc.) as **GDPR Art. 9 health data**.

Consequences:

- **Explicit consent** required before health-related provider sync (`health_data_consent`).
- **Separate AI consent** is a **hard gate** (`ai_processing_consent`) — LLM briefing blocked without it; deterministic engines remain OK.
- Minimize logs: **no credentials, no body metrics** in application logs.

---

## 2. Responsable

| Role | Value |
| --- | --- |
| Controller | Augustin Briolon (personne physique) |
| Privacy contact | `augustin.briolon@gmail.com` |

---

## 3. Décisions actées (2026-09-02)

| Decision | Lock |
| --- | --- |
| AI consent | **Hard gate** (no LLM path without `ai_processing_consent`) |
| Controller | Augustin Briolon |
| Contact email | `augustin.briolon@gmail.com` |
| Account deletion | Soft-delete, then **purge at J+30** |
| Legal copy | **FR only** |
| Access model | Classic signup (Clerk). « Cercle privé » = GTM bouche-à-oreille — **not** a technical invite lock. Wording must **not** say invite-only. |

---

## 4. Livrables P1–P7

| ID | Deliverable | Notes |
| --- | --- | --- |
| P1 | `/privacy` | Copy source: [`PRIVACY_PAGE_FR_V0.md`](./PRIVACY_PAGE_FR_V0.md) |
| P2 | `/terms` | Copy source: [`TERMS_PAGE_FR_V0.md`](./TERMS_PAGE_FR_V0.md) |
| P3 | Consent gates | Signup accept privacy+terms; provider connect; AI hard gate — see eng brief |
| P4 | Export | Athlete JSON export of personal data held by Sharpit |
| P5 | Delete | Soft-delete → purge J+30 |
| P6 | Health disclaimer | Science Sport validated (verbatim below) |
| P7 | Unofficial disclaimer | Ack before connecting unofficial / as-is integrations |

**Out of scope for Privacy mini V0:** DPO appointment, DPA renegotiation, EN legal pages, invite-only gate, medical-device claims, general model training on athlete data.

---

## 5. Eng gates (summary)

1. **Account use:** require `terms_accepted_at` + `privacy_accepted_at` (+ `privacy_version`).
2. **Provider connect (health classes):** require `health_data_consent_at` + `unofficial_providers_ack_at` when applicable.
3. **LLM briefing / coach AI paths:** require `ai_processing_consent_at`. Deterministic inference engines may run without AI consent.
4. **Export:** JSON download of athlete-scoped data.
5. **Delete:** soft-delete immediately; hard purge at **J+30**.
6. **Logging:** never log credentials or body metrics.

Field table and QA checklist: [`PRIVACY_ENG_BRIEF_V0.md`](./PRIVACY_ENG_BRIEF_V0.md).

---

## 6. Health disclaimer (verbatim — Science Sport)

> Sharpit est un outil d’aide à l’entraînement. Ce n’est pas un dispositif médical et ça ne remplace pas un avis médical. Les signaux (récupération, fatigue, risques) sont des estimations d’entraînement, pas un diagnostic.

Surface this on privacy/terms-adjacent UX and wherever coaching signals are first explained. Do not paraphrase in legal pages without product sign-off.

---

## 7. Implementation pointer

Soft Eng implements Privacy mini against this brief + [`PRIVACY_ENG_BRIEF_V0.md`](./PRIVACY_ENG_BRIEF_V0.md). Page copy ships from the FR drafts; do not invent additional legal claims beyond these documents.
