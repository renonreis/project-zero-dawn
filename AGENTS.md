# Project Zero Dawn

The engineer's core agentic engineering workflow: the method (docs), the workflow skills every project runs, the global agent rules, and a portfolio registry of the projects it manages. Project state (scope, specs, reviews) lives in each project's own repo, never here; this repo only points to them.

## Layout

- `skills/<name>/`: the nine workflow skills (`scope`, `audit`, `architect`, `develop`, `check`, `test`, `document`, `sync`, `debug`). Forked from `jsmastery-pro/skills` (MIT), see `NOTICE.md`.
- `agents/`: Claude Code subagents the skills spawn (`scout`, `researcher`).
- `global/RULES.md`: rules loaded in every session on this machine (imported from `~/.claude/CLAUDE.md` by the installer).
- `docs/workflow/`: the method, in PT-BR, for the engineer.
- `docs/portfolio/registry.md`: one row per managed project.
- `docs/scope/`, `docs/specs/`: Zero Dawn's own scope and decisions (this repo runs its own workflow).
- `upstream/`: pristine upstream docs and license, kept for diffing.
- `scripts/`: `install.sh` (symlinks skills and agents, wires global rules), `check-portability.mjs` (skill conventions and size budgets), `upstream-diff.sh`.

## Commands

- `npm run check`: run before committing any change under `skills/`. Must pass; a hot path over 90% means prune, not raise the budget.
- `scripts/install.sh` / `scripts/install.sh --uninstall`: idempotent; safe to rerun after adding a skill.
- `scripts/upstream-diff.sh`: compare our skills with the latest upstream before porting changes.

## Rules

- Language: docs under `docs/workflow/` and `README.md` in PT-BR; everything an agent reads or writes as a contract (`SKILL.md`, `AGENTS.md`, `global/RULES.md`, scope, specs, registry) in English.
- Skill edits follow `upstream/conventions.md`: every line must change behavior; no hyphens or dashes in skill prose (the checker enforces it); the `OUTPUT-STYLE` block stays byte identical across skills.
- Keep adaptations surgical so upstream changes can still be ported. Record every deliberate divergence from upstream in `docs/workflow/09-mantendo-o-core.md` (adaptations table).
- Never put project specific state here beyond the registry row.

## Git

- integration: on
- branch prefix: `feat/`
- commit: per-milestone
- autonomy: full
