
Goal: land the code of feature 6 (Badge) in this clone: component, variants, stories, tests, export, and changeset, per `docs/specs/0005-badge/`. The Paper artboards are drawn and approved; do not touch Paper. Out of reach here, so leave them out and say so: the Docker visual baselines (AC-10) and the parity table (AC-11). There is no network, no remote, and no one to answer questions; if something is undecided, choose the safest option the spec allows and say why.

Effort: high.

Done when:
- AC-6, AC-7, AC-8, AC-9 (stories and Vitest cases), and AC-12 of spec 0005 hold.
- `pnpm typecheck`, `pnpm lint`, and `pnpm --filter @renonreis/triquetra exec vitest run src/components/badge` pass, or you report exactly what could not run.
- The final message is a work report: what you built, the evidence for each claim, and what was not tested.
