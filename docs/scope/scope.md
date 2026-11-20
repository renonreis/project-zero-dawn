# Scope: Project Zero Dawn

The engineer's core agentic engineering workflow: method docs, the nine workflow skills, global agent rules, and the registry of every project it manages.

**Build approach:** Tracer Bullet (prove the whole loop on one real project, the design system, before polishing any part).
**Workflow:** Beta (after develop: check verify, then test). Skill edits are verified with `npm run check` and a real run on the pilot project.
**Repository:** public, [renonreis/project-zero-dawn](https://github.com/renonreis/project-zero-dawn).

_These are recommendations, not requirements. You decide when a feature is `done`._

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Workflow method docs | Foundation | done |
| 2 | Skills fork and adaptations | Foundation | in-progress |
| 3 | Installation and global rules | Foundation | done |
| 4 | Portfolio registry | Foundation | done |
| 5 | GitHub repository | Foundation | done |
| 6 | Model routing per skill | Slice 1 | done |
| 7 | Pilot: design system in Paper | Slice 1 | in-progress |
| 8 | Plugin or marketplace distribution | Deferred | planned |
| 9 | GAIA persona and agent naming | Slice 1 | in-progress |
| 10 | Other harnesses (Copilot, Gemini, own harness) | Deferred | planned |

## Foundations

### 1. Workflow method docs · done
PT-BR docs that explain the method, adapted from the reference guide.
**Done when:** the engineer reviewed `docs/workflow/` and it matches how they want to work.
- [x] Write docs 01 to 09: spec 0001
- [x] Engineer review and corrections (approved 2026-11-20)

### 2. Skills fork and adaptations · in-progress
Nine skills forked from jsmastery-pro/skills with surgical Zero Dawn adaptations (A1 to A7).
**Done when:** `npm run check` passes and each adapted path ran once on a real project.
- [x] Vendor upstream verbatim, then adapt: spec 0001
- [ ] Exercise adapted paths on the pilot (cross provider review, Paper source, autonomy, registry)

### 3. Installation and global rules · done
Symlink install into `~/.claude` and `~/.agents`, plus `global/RULES.md` imported in every session.
**Done when:** a fresh session in another project lists the nine skills and follows the global rules.
- [x] `scripts/install.sh` with uninstall
- [x] Confirm in a new session outside this repo

### 4. Portfolio registry · done
One row per managed project, maintained by `/scope` and `/sync`.
**Done when:** every active project has a row with repo, status, and tier.
- [x] `docs/portfolio/registry.md`
- [x] Add the engineer's current projects (new ones enroll through `/scope` or `/audit`)

### 5. GitHub repository · done
Publish Zero Dawn to GitHub and open the phase 1 PR.
**Done when:** the repo exists with the agreed visibility and phase 1 is merged.
- [x] Engineer picks public or private (public)
- [x] Create repo, push, PR, merge (PR #1)

## Slice 1

### 6. Model routing per skill · done
Assign a provider and model per skill and subagent to balance quality and quota (`docs/workflow/06-modelos.md`).
**Done when:** a spec records the routing and skills or harness settings apply it.
- [x] Reviewer evidence: five GPT 6.2 Sol cross checks, then this spec's own cross check on Gemini 3.8 Flash; Copilot dropped (quota), so the three reviewer experiment is replaced by one Gemini vs GPT OSS comparison
- [x] Decide routing: spec 0002 (Claude Pro writes, Antigravity reviews and drafts)
- [x] Apply: `global/RULES.md`, reviewer order in `check` and `architect` (A2, A3), `docs/workflow/06-modelos.md`
- [ ] Compare Gemini 3.8 Flash and GPT OSS 120B once on the next pilot `/check review`

### 7. Pilot: design system in Paper · in-progress
First real project through the workflow (brownfield), proving the loop end to end. Tokens live in the DS code; Paper is the source of component design (see `docs/workflow/07-design-system-paper.md`).
**Done when:** the design system has AGENTS.md, a scope, a UI foundation spec (token contract from the code, parity with Paper), and one shipped slice.
- [x] Locate the Paper file and code repo (Paper file in registry; repo renonreis/triquetra-design-system)
- [x] `/audit` then `/scope` in the design system project (triquetra-design-system#41)
- [x] UI foundation spec in the design system project: `/architect UI foundation` (spec 0001, triquetra-design-system#44, #45)
- [ ] Ship one slice through `/develop`, `/check verify`, `/test`

### 9. GAIA persona and agent naming · in-progress
Naming layer only: the main session is GAIA and each skill runs as one of her nine subordinate functions, mapped by function (glossary in `docs/workflow/10-gaia.md`).
**Decision (2026-11-20):** keep the mythological names behind GAIA (scope DEMETER, audit POSEIDON, architect ELEUTHIA, develop HEPHAESTUS, check HADES, test ARTEMIS, document APOLLO, sync AETHER, debug MINERVA); `scout`, `researcher`, and delegated children keep functional names. Names surface in docs, delegated thread titles, and one `global/RULES.md` line; never in `SKILL.md`, `OUTPUT-STYLE`, commands, or commit trailers. No voice or boundary changes. No game art or other game terms; revisit before feature 8.
**Done when:** the engineer keeps the names after real use on the pilot.
- [x] Decide naming (brainstorm, direction A)
- [x] Glossary doc and `global/RULES.md` line
- [ ] Try on the pilot (delegated thread titles, session intro), then keep, adjust, or drop

## Deferred

### 8. Plugin or marketplace distribution
Package skills as a Claude Code plugin for versioned installs on other machines. Evaluate together after the pilot.
- [ ] Evaluate: `/architect distribution`

### 10. Other harnesses (Copilot, Gemini, own harness)
Make skills load natively outside Claude Code (skills dirs, adapters), and inform a possible own harness.
- [ ] Evaluate: `/architect harness support`
