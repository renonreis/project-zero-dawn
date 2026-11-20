# 0001. Workflow core: forked skills, global rules, and a portfolio registry

**Status**: Accepted
**Date**: 2026-11-20
**Scope**: features 1 to 4

## Summary

Zero Dawn is a method and skills repo, not a project container. It forks the MIT licensed jsmastery-pro/skills, adapts them surgically, installs them globally by symlink, loads a short set of global rules in every session, and keeps a registry that points to each project's repo.

## Requirements

- AC1: The nine workflow skills are available in every project on this machine without copying.
- AC2: Every deliberate divergence from upstream is listed and visible as a diff against the verbatim import commit.
- AC3: `npm run check` passes (upstream portability rules and size budgets).
- AC4: Global rules (autonomy, deploy gate, Hostinger ban, language, model preference) load in every session.
- AC5: Project state stays in each project's repo; Zero Dawn holds only one registry row per project.
- AC6: Install is idempotent, never overwrites files it does not own, and can be fully undone.

## Decision

- Role: method + skills + portfolio registry (option B). Not a monorepo of projects.
- Skills: fork upstream at `43b69e4`, commit verbatim, adapt in separate commits (A1 to A7 in `docs/workflow/09-mantendo-o-core.md`).
- Distribution: symlinks from `scripts/install.sh` into `~/.claude/skills`, `~/.agents/skills`, `~/.claude/agents`; plugin packaging deferred (feature 8).
- Global rules: `global/RULES.md`, imported through a managed block in `~/.claude/CLAUDE.md`.
- Language: PT-BR for human docs; English for every agent contract (skills, AGENTS.md, scope, specs, registry, code, commits).
- Git autonomy: new `autonomy` key in the `## Git` block. `full` allows branch, commit, push, PR, merge without asking. Deploy always confirms. Hostinger forbidden.
- Cross model critique and review: prefer another provider through T3 Code `delegate_task`; fall back to a contrasting Claude model.
- Design source: Paper by default.
- No default stack; each project decides via `/architect`.

## Rationale

Forking beats writing from scratch (proven, maintained skills) and beats using them unmodified (the engineer's rules on autonomy, Paper, and model routing must be encoded). Keeping adaptations surgical keeps upstream improvements portable. Symlinks give one source of truth while the engineer works solo. Holding only pointers in the registry keeps the workflow's core principle: state lives with the code.

## Build plan

1. Vendor upstream verbatim (AC2)
2. Apply A1 to A7, pass `npm run check` (AC2, AC3)
3. Write `global/RULES.md` and `scripts/install.sh` (AC1, AC4, AC6)
4. Write `docs/workflow/`, `docs/portfolio/registry.md`, scope (AC5)
5. Run the installer and confirm links and import (AC1, AC4, AC6)

## Consequences

- Skill names are generic (`/test`, `/check`, `/sync`); a future built in or plugin with the same name would collide. The installer skips existing names instead of overwriting.
- Edits here apply to every project immediately; break a skill and every project feels it. Run `npm run check` before committing.
- Cross provider review sends diffs to GitHub Copilot or Google; acceptable for the engineer's own projects, reconsider for client work.

## Follow-up

- Model routing per skill (feature 6).
- Plugin distribution (feature 8), other harnesses (feature 10).
