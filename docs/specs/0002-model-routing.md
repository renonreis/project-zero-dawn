# 0002. Model routing per skill

**Status**: Accepted
**Date**: 2026-11-20
**Scope**: feature 6
**Supersedes**: the "GPT on GitHub Copilot" reviewer preference in spec 0001

## Summary

Zero Dawn routes work across two providers only: Claude Pro (`claudeAgent`) and Antigravity (`antigravity`). GitHub Copilot is dropped. Claude Pro writes everything (judgment and builds); Antigravity reviews, critiques, and drafts prose, so review always comes from another model family. GAIA applies the table when it launches or delegates a thread. No `SKILL.md` carries a `model:` field.

## Requirements

- AC1: Each of the nine skills and both subagents has exactly one routed target and an ordered fallback, recorded in this spec as T3 IDs.
- AC2: Review and critique never run on the family that wrote the artifact, except as a last resort fallback or when the engineer explicitly picks `Same model`; then the reply states that the review was not independent.
- AC3: Claude Pro quota goes to authoring (judgment and builds); review, critique, and prose run on Antigravity.
- AC4: The routing works whether the session runs in Claude Code or in another T3 provider (no harness only fields in skills).
- AC5: A session on a model other than the routed one is told once and offered a relaunch; it is never blocked.
- AC6: `global/RULES.md` carries the routing summary and an absolute link to this spec, so every session in every repo sees it.

## Decision

### Routing table

Targets as `providerInstanceId` · `model`, confirmed with `orchestrator_capabilities` on 2026-11-20. Binding: `delegate_task` takes `target.providerInstanceId` + `target.model`; `t3_thread_launch` takes `modelSelection.instanceId` + `modelSelection.model` with the same values.

| Skill or subagent | Routed target | Fallback, in order |
|---|---|---|
| `/scope`, `/architect`, `/debug` | `claudeAgent` · `claude-opus-5-5` | `antigravity` · `claude-opus-4-6-thinking` |
| `/develop`, `/test`, `/check verify` | `claudeAgent` · `claude-sonnet-5-5` | `antigravity` · `claude-sonnet-4-6` |
| `/develop`, escalated | `claudeAgent` · `claude-opus-5-5` | `antigravity` · `claude-opus-4-6-thinking` |
| `/audit`, `/sync` | `claudeAgent` · `claude-sonnet-5-5` | `antigravity` · `claude-sonnet-4-6` |
| `/architect` cross check, `/check review` | `antigravity` · `gemini-3.8-flash` (`thinking_level: high`) | `antigravity` · `gpt-oss-120b-medium`; then the contrasting Claude model (AC2 exception) |
| `/document` | `antigravity` · `gemini-3.8-flash` | `claudeAgent` · `claude-haiku-5-5` |
| `scout`, `researcher` subagents | `haiku` (agent frontmatter, Claude Code) | session model outside Claude Code |

### Rules

- **Authoring stays in the Claude family, review leaves it.** Builds and specs are Claude; reviewers are Gemini or GPT OSS, so the review is independent by construction. `/check review` step 1b can answer "Claude, <tier>" from this table.
- **Critical area**: a spec is critical when its Summary or Decision covers authentication or permissions, data integrity, payments, or schema or data migrations. When unsure, ask the engineer once and record the answer in the spec.
- **`/develop` escalates to Opus** when its spec is critical, or after two consecutive failing `/check verify` reports in `docs/reviews/` for the same feature. A passing verify resets the count. `/test` and `/check verify` stay on Sonnet: their output is checked by running it.
- **Fallback trigger**: the routed provider is disabled in `orchestrator_capabilities`, or a delegated or launched run fails with a quota, rate limit, or unavailable error. GAIA then dispatches to the next fallback without asking and names the fallback used in the reply.
- **Mismatch** (AC5): checked by the skill at start, only when the session's model comes from a reliable source (the T3 thread's model selection, `ANTHROPIC_MODEL`, or settings; never self introspection). If it differs, say so once per thread and offer to relaunch through `t3_thread_launch` on the routed target; relaunch only on the engineer's yes, otherwise continue.
- **Where it is applied**: GAIA reads this table when launching or delegating. `/check review` and the `/architect` cross check pick the Antigravity reviewer themselves (adaptations A2, A3). Subagent models stay in `agents/*.md` frontmatter. No `model:` in any `SKILL.md`.

## Rationale

- **Copilot dropped** (engineer decision, 2026-11-20): its monthly quota ran out mid task, the first attempt to cross check this spec on GPT 6.2 Sol failed with "You have exceeded your monthly quota", and two providers are simpler to reason about.
- **Builds on Claude Pro Sonnet 5.5**: the engineer's earlier split (Pro for interactive work, Copilot for long builds) has no Copilot left. Antigravity's Claude models are one generation older, so they serve as the quota fallback, not the default.
- **Gemini 3.8 Flash as reviewer**: it is the only strong non Claude family model available. Five earlier cross checks on GPT 6.2 Sol (Triquetra specs 0001 to 0003, renon.dev page design, Zero Dawn PR #7) proved cross family review finds real blockers; this spec's own cross check on Gemini 3.8 Flash returned 13 findings, nine applied (two contradictions between ACs and fallbacks, unbound criteria for escalation and mismatch, malformed IDs), which is the first evidence for Gemini in that role.
- **GPT OSS 120B as second reviewer**: a third family, still not Claude, so AC2 holds before the last resort.
- **`/document` on Gemini Flash**: prose drafted from a diff is cheap to verify and costs no Claude quota.
- **No `model:` in skills**: only Claude Code reads it; it would misroute other providers and diverge from upstream.
- **Rejected**: GPT reviews via Copilot (dropped); builds on Antigravity Claude 4.6 by default (older models where the most code is written); a hard block on mismatch; bypassing `/check review` step 1b (an upstream divergence to save one question).

## Build plan

1. Write this spec (AC1, AC2, AC3)
2. Routing summary, absolute spec link, and mismatch rule in `global/RULES.md` (AC4, AC5, AC6)
3. Reviewer order in `skills/check/modes/review.md` and `skills/architect/internal/after-subagent.md` (A2, A3)
4. `docs/workflow/06-modelos.md`, adaptations table in `docs/workflow/09-mantendo-o-core.md`, feature 6 in `docs/scope/scope.md`
5. `npm run check`

## Consequences

- Claude Pro carries all authoring. When its quota runs out, work drops to Antigravity's Claude 4.6 models, which are weaker; expect more correction rounds then.
- Antigravity carries every review and all docs; if it is down, review falls to a contrasting Claude model and loses independence (stated in the reply).
- Outside Claude Code, `scout` and `researcher` inherit the session model; delegating each scan would cost more than it saves.
- Model IDs change. When a routed model disappears, run `orchestrator_capabilities` and amend this spec rather than improvising.
- Specs and diffs go to Google for review (accepted in spec 0001 for the engineer's own projects; reconsider for client work).
- `scripts/install.sh` still links `global/RULES.md` into the Copilot CLI instructions; harmless, removed with feature 10 if Copilot stays dropped.

## Follow-up

- Compare Gemini 3.8 Flash and GPT OSS 120B once on the next pilot `/check review`; record findings and noise here.
- Revisit if Antigravity gains a Gemini Pro model (it would replace Flash as the reviewer).
