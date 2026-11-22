# Portfolio registry

One row per project managed through Zero Dawn. Pointers only: each project's state lives in its own repo (`AGENTS.md`, `docs/scope/`, `docs/specs/`). `/scope` adds a row when a project is born or enrolled; `/sync` updates status, current feature, tier, and date with surgical edits.

| Project | Repo | Visibility | Kind | Tier | Status | Current feature | Design source | Updated |
|---|---|---|---|---|---|---|---|---|
| Project Zero Dawn | [renonreis/project-zero-dawn](https://github.com/renonreis/project-zero-dawn) | public | workflow core | Beta | in-progress | Phase 1 foundation | n/a | 2026-11-20 |
| Triquetra Design System | [renonreis/triquetra-design-system](https://github.com/renonreis/triquetra-design-system) | public | design system (pilot, brownfield, TypeScript) | Beta | in-progress | Slice 2 done (Textarea, Radio Group, Badge, Alert, Tooltip); next: plan the next slice (`/scope`) | [Paper](https://app.paper.design/file/01M7R4TP595GEKCEE8SHQCTJMX/p-2-0) (components; tokens live in the repo) | 2026-11-21 |
| Token manager | not created | tbd | tool (manages and distributes DS and brand tokens to code and Paper) | tbd | planned | Idea, not enrolled | n/a | 2026-11-20 |
| Central Administrativa (HR admin console) | [MarianaArcine/CentralAdministrativa](https://github.com/MarianaArcine/CentralAdministrativa) | private | internal tool (HR administration, external owner, brownfield, Python Flask) | GA | in-progress | Onboarded ([PR #1](https://github.com/MarianaArcine/CentralAdministrativa/pull/1)); 1. Test harness foundation built, verified, tested, reviewed ([PR #2](https://github.com/MarianaArcine/CentralAdministrativa/pull/2)), awaiting owner review; next: 2. Safe auto save script (`/architect`) | n/a | 2026-11-21 |
| renon.dev | [renonreis/renon.dev](https://github.com/renonreis/renon.dev) | private | personal site (brownfield, PHP, WordPress) | tbd | paused | Audit done; to be replaced by renon-dev at launch | n/a | 2026-11-20 |
| renon-dev | [renonreis/renon-dev](https://github.com/renonreis/renon-dev) | public | personal site (greenfield, static, EN + PT) | Alpha | in-progress | Features 1 to 4 done (3: bilingual content, verified 2026-11-21); next: 5. Layout & motion foundation (`/architect`) | Paper | 2026-11-21 |

## Columns

- **Status**: `planned` · `in-progress` · `paused` · `shipped` · `archived`.
- **Kind**: product, library, design system, site, internal tool, workflow core.
- **Design source**: Paper, Figma, images, generated, n/a.
