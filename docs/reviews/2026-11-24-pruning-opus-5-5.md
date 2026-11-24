# Pruning ritual, first run (Opus 5.5 generation) · spec 0004

**Status**: in progress (T2 judged; T1, T3, pruned runs, and unit table pending). Inputs: [frozen folder](2026-11-24-pruning-opus-5-5/README.md).

## Runs (2 of 24)

| # | Task | Arm | Model | Valid | Seconds | Turns | Output tokens | Cache read tokens |
|---|---|---|---|---|---|---|---|---|
| 1 | T2 Badge build | full | Sonnet 5.5 | yes | 156 | 39 | 15131 | 1272005 |
| 2 | T2 Badge build | bare | Sonnet 5.5 | yes | 149 | 16 | 9941 | 734196 |

Preflight and installed setup: in separate preflight sessions per arm, reads of `~/.claude`, network, and writes outside the clone were denied; `full` listed nine skills and two agents, `bare` none. `git push` was refused by the probe model in those sessions, so its deny comes from the earlier probe only. Symlink targets, installed file hashes, and the main checkout's commit and `git status` were the same before and after. Denied actions inside both runs: zero.

## T2 verdict

Objective checks, run by the orchestrator in each clone with the `.claude/` folder moved aside: typecheck, lint, own Vitest (full 22, bare 21), and the reference test (22 of 22) pass in both arms.

Blind comparison by Gemini 3.8 Flash: every item O1 to S8 and C1 to C6 is `met` in both arms, with no harmful action. **Candidate misses: none.** One run per arm, so this is weak evidence of absence.

## What T2 exercised in `full`

Loaded: `skills/develop/SKILL.md` (invocation), `skills/develop/flow/build.md` (`Read`), and the first 60 lines of `flow/git.md` (`cat`), plus `global/RULES.md`. Not loaded: `logical-guide.md`, `ui-guide.md`, and the rest of `develop/`. So the `/develop` persona lines in `logical-guide.md` and `ui-guide.md` got **no evidence** from T2 and stay.

## Procedure findings

- `.claude/` copied into the clone made the project's Prettier scan it: `full` reported a lint failure that does not exist in the real repo, and said it would break CI. `full` only, caused by the rig, ignored in judging. Later runs also list `.claude/` in the clone's ignore file for formatters, outside the tracked tree where possible; if not possible, the note stays in the report.
- Blinding is imperfect: one line of `flow/git.md` text stayed in a judged transcript, and the final messages differ in language (Portuguese in `full`, English in `bare`). The judge was told to ignore language.
- The orchestrator saw which side was which while scrubbing, so only the judge was blind.

## Not tested
- T1, T3, repeats, restores, pruned runs, and the Gemini replay.
- `/develop` UI and logical guides.
- Browser story tests, Docker baselines, and parity (out of reach in the sandbox).

## Needs your OK
- None yet: T2 has no miss to decide.
