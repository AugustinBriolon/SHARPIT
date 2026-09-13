# /caveman

Load and follow the **caveman** skill until the user says to speak normally again.

1. If `.agents/skills/caveman/SKILL.md` is missing, run `npx skills experimental_install`, then continue.
2. **Read** `.agents/skills/caveman/SKILL.md` first; follow it.
3. Speak in compressed caveman mode for this conversation (terse, high-signal). Do not drop technical accuracy. Keep French UI strings as shipped.
4. Precedence unchanged: `docs/design/*` + `PRODUCT.md` + `CORE_ARCHITECTURE.md` win over any skill default.
5. Exit caveman mode when the user asks for normal speech.
