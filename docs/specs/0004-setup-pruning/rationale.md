# 0004. Rationale: evidence based setup pruning

## Context

Zero Dawn loads global rules in every session and nine skills forked from upstream. Some text compensates for weaknesses of older models, including personas such as a senior engineer with years of experience. The byte budgets of `npm run check` limit growth but say nothing about whether a line still changes behavior.

Skills are symlinked into the live user setup, so editing them affects every running thread. Safety text is mixed with style text in the same files. The same skills also serve Gemini, which a Claude jump does not change.

Runs spend Claude Pro quota, the repo is public, and upstream improvements are ported by hand. Not deciding means rules only accumulate, or get cut by taste.

## Options considered

### Option 1: Review the text and cut by judgment

**Pros**: no quota; finished in an hour. **Cons**: no evidence; a model judging its own instructions tends to call them all useful or all obvious.

### Option 2: Paired replays in throwaway clones, restore by evidence

**Pros**: a control, a repeatable base, isolation, and a trace from miss to rule. **Cons**: quota, preparation of answer keys, small samples.

### Option 3: Uninstall live and work bare for a week

**Pros**: real interactive work with every tool. **Cons**: disturbs every thread, safety rules leave too, no control, and nothing repeats.

### Option 4: Remove one rule at a time from the full setup

**Pros**: clean attribution. **Cons**: hundreds of units; far beyond the quota, and redundant rules hide each other.

## Rationale

Option 2 fits the forces: live symlinks rule out Option 3, quota rules out Option 4, and the need for evidence rules out Option 1. Starting bare finds misses with few runs, the exercise rule stops absence of evidence from becoming a cut, and the pruned run covers interactions between cuts.

Engineer decisions on 2026-11-24: everything unprotected leaves in the bare arm and only exercised text is cut; three replays; clone with `--setting-sources`; frozen checklist, blind reviewer, engineer decides; models by task with a Gemini confirmation; one run per arm with candidates repeated; one PR per skill; a broad closed protected list; trigger on a new routed generation; fixed answer sheet; summary in the repo and raw files local; planted defects for review; three final pruned runs; a limit of 24 runs.

The T3 answer key is planted because #17 has no review report or PR comments, and its tree contains the skills themselves.

## Cross check

Gemini 3.8 Flash (thinking high), 2026-11-24: ten findings. Eight fixes applied with the engineer's yes. The T3 model finding went to the engineer, who kept Opus plus Gemini. Rejected: the claim that `Skill` and `Agent` are not tools, and voiding a run that writes the spec in turn 1 (that is evidence).

## Probe evidence

Claude Code 2.1.325, Haiku 5.5, throwaway repo, 2026-11-24:

| Probe | Result |
|---|---|
| Alternate `CLAUDE_CONFIG_DIR` | `loggedIn: false` |
| `--bare` (help text) | needs an API key; OAuth is never read |
| `--safe-mode` | user rules gone, project `CLAUDE.md` gone too |
| `--setting-sources project --strict-mcp-config` | login kept; user rules, skills, agents, plugins, and MCP servers gone; project `CLAUDE.md`, skills, and agents load |
| `git push` deny rule in `bypassPermissions` | denied, sink repo empty |
| Read of `~/.claude` by `cat`, `Read`, and Python with the sandbox | denied |
| Python read of the main checkout under `~/.t3` | denied |
| Write outside the clone | denied |
| Network, `allowedDomains: []`, `bypassPermissions` | reachable, so this mode is rejected |
| Network, `allowedDomains: []`, `dontAsk` | all hosts denied |
| Two turns through `--input-format stream-json` without persistence | context kept between turns |
| `Write` outside the clone in `dontAsk`, `--allowedTools` with bare `Edit,Write` | written to `/private/tmp`, so AC-5 fails |
| Same, with `Edit(/**),Write(/**)` | denied, also from a subagent; inside writes work |
| Cloud tools (`Artifact`, `RemoteTrigger`, `Cron*`) with user settings off | listed by `init`; gone once denied in `sandbox.json` |
| Triquetra typecheck, lint, and Vitest inside the sandbox | pass after an outside install |

Amended 2026-11-24 during `/develop` with the engineer's yes: scoped `Edit` and `Write` flags and the cloud tool denies. Not probed: full runs on Opus or Sonnet.
