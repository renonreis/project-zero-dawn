# 0002. Model routing per skill

**Status**: Accepted
**Date**: 2026-11-20
**Scope**: feature 6

## Summary

Every workflow skill and subagent has a home provider and model. Judgment heavy, interactive work runs on Claude Pro; long builds and verifiable work run on Claude models through GitHub Copilot; review and critique run on another model family; cheap prose runs on Gemini. GAIA applies the table when it launches or delegates a thread. No `SKILL.md` carries a `model:` field.

## Requirements

- AC1: Each of the nine skills and both subagents has exactly one routed provider and model, recorded in this spec.
- AC2: Review and critique never run on the family that wrote the artifact.
- AC3: Claude Pro quota is spent only on interactive judgment work (`/scope`, `/architect`, `/debug`).
- AC4: The routing works whether the session runs in Claude Code or in another T3 provider (no harness only fields in skills).
- AC5: A session on a model other than the routed one is told once and offered a relaunch; it is never blocked.
- AC6: `global/RULES.md` carries a short pointer so every session, on every provider, sees the routing.

## Decision

### Routing table

IDs are T3 `delegate_task` targets (`providerInstanceId` · `model`), confirmed with `orchestrator_capabilities` on 2026-11-20.

| Skill or subagent | Provider · model | Fallback |
|---|---|---|
| `/scope` | `claudeAgent` · `claude-opus-5-5` | Copilot `claude-opus-5.5` when Pro quota is out |
| `/architect` | `claudeAgent` · `claude-opus-5-5` | Copilot `claude-opus-5.5` |
| `/architect` spec cross check | `acpRegistry_github_copilot` · `gpt-6.2-sol` | `antigravity` · `gemini-3.8-flash`, then contrasting Claude model |
| `/debug` | `claudeAgent` · `claude-opus-5-5` | Copilot `claude-opus-5.5` |
| `/develop` | `acpRegistry_github_copilot` · `claude-sonnet-5.5` | `claudeAgent` · `claude-sonnet-5-5` |
| `/develop`, escalated | `acpRegistry_github_copilot` · `claude-opus-5.5` | `claudeAgent` · `claude-opus-5-5` |
| `/test` | `acpRegistry_github_copilot` · `claude-sonnet-5.5` | `claudeAgent` · `claude-sonnet-5-5` |
| `/check verify` | `acpRegistry_github_copilot` · `claude-sonnet-5.5` | `claudeAgent` · `claude-sonnet-5-5` |
| `/check review` | `acpRegistry_github_copilot` · `gpt-6.2-sol` | `antigravity` · `gemini-3.8-flash`, then contrasting Claude model |
| `/audit` | `claudeAgent` · `claude-sonnet-5-5` | Copilot `claude-sonnet-5.5` |
| `/sync` | `claudeAgent` · `claude-sonnet-5-5` | Copilot `claude-sonnet-5.5` |
| `/document` | `antigravity` · `gemini-3.8-flash` | Copilot `claude-haiku-5.5` |
| `scout` subagent | `haiku` (agent frontmatter) | inherits session model outside Claude Code |
| `researcher` subagent | `haiku` (agent frontmatter) | inherits session model outside Claude Code |

### Rules

- **Builds stay in the Claude family.** `/develop`, `/test`, and `/check verify` run Claude models (through Copilot) so GPT stays an independent reviewer. If a build ever runs on GPT, its review moves to Gemini.
- **`/develop` escalates to Opus** when the spec marks the area critical (auth, data integrity, payments, migrations) or after two consecutive `/check verify` failures on the same slice. Otherwise Sonnet.
- **Fallback order** applies only when the routed provider is unavailable or its quota is exhausted; say which fallback ran in the reply.
- **Mismatch** (AC5): when a skill starts on a model other than its routed one, say so once and offer to relaunch on the routed target through T3; continue if the engineer declines.
- **Where it is applied**: GAIA reads this table when it launches or delegates (`t3_thread_launch`, `delegate_task`). `/check review` and the `/architect` cross check already pick another provider (adaptations A2, A3). Subagent models stay in `agents/*.md` frontmatter. No `model:` in any `SKILL.md`.

## Rationale

- **Evidence**: five cross checks delegated to GPT 6.2 Sol (Triquetra specs 0001 to 0003, the renon.dev page design, Zero Dawn PR #7) each took about 2 to 2.5 minutes and found real blockers (a conflicting Paper gate, an unpinned baseline, missing partial run recovery, broken pointers). That proves GPT Sol as the primary reviewer; the full "three reviewers, one feature" experiment adds little before Gemini is tried once (follow-up below).
- **Quota**: the engineer's split (option B) keeps Claude Pro for conversation heavy work, where a stronger model saves rounds of correction, and moves long autonomous builds to Copilot, where token volume is highest.
- **`/audit` and `/sync` on Claude Pro Sonnet**: the engineer chose Pro over Copilot; both ask questions or run right after a merge, inside an interactive session.
- **`/document` on Gemini Flash**: prose drafted from a diff is cheap to verify and costs no Claude quota.
- **No `model:` in skills**: that frontmatter is read only by Claude Code and would misroute or break under Copilot or Antigravity, and it would diverge from upstream for no portable gain.
- **Alternatives rejected**: all Claude Pro (quota runs out on builds); GPT for builds (forces review onto Gemini Flash, the weakest strong option); a hard block on mismatch (the engineer often has a good reason).

## Build plan

1. Write this spec (AC1, AC2, AC3)
2. Add the routing pointer and mismatch rule to `global/RULES.md` (AC4, AC5, AC6)
3. Replace the draft in `docs/workflow/06-modelos.md` with the decided table (AC1)
4. Update feature 6 in `docs/scope/scope.md`
5. `npm run check`

## Consequences

- The table names concrete model IDs; catalogs change. When a routed model disappears, run `orchestrator_capabilities` and amend this spec rather than improvising.
- Copilot runs Claude builds, so Copilot quota becomes the bottleneck for `/develop` and `/test`. If it runs out, the fallback moves builds back onto Claude Pro.
- Diffs and specs go to GitHub Copilot and Google for review and docs (already accepted in spec 0001 for the engineer's own projects; reconsider for client work).

## Follow-up

- Run Gemini 3.8 Flash in parallel with GPT 6.2 Sol on the next pilot `/check review` once, to validate the fallback; record the comparison here.
- Revisit if Antigravity gains a Gemini Pro model (it would replace Flash as the review fallback).
