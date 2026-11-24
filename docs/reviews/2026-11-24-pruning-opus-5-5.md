# Pruning ritual, first run (Opus 5.5 generation) · spec 0004

**Status**: in progress (T1, T2, T3 judged and the T1 candidates repeated; one miss waits on the engineer; restores, unit table, pruned runs, and reviewer replay pending). Inputs: [frozen folder](2026-11-24-pruning-opus-5-5/README.md).

## Runs (11 of 24, or 7 if runs 3 to 6 do not count)

| # | Task | Arm | Model | Valid | Seconds | Turns | Output tokens | Cache read tokens |
|---|---|---|---|---|---|---|---|---|
| 1 | T2 Badge build | full | Sonnet 5.5 | yes | 156 | 39 | 15131 | 1272005 |
| 2 | T2 Badge build | bare | Sonnet 5.5 | yes | 149 | 16 | 9941 | 734196 |
| 3 to 6 | T3 full, T3 bare, T1 full, T1 bare | | | no: plan quota hit in the preflight probe, the task never started | | | | |
| 7 | T3 zd-gate review | full | Opus 5.5 | yes | 358 | 24 | 37173 | 524552 |
| 8 | T3 zd-gate review | bare | Opus 5.5 | yes | 333 | 13 | 35229 | 388453 |
| 9 | T1 Alert spec | full | Opus 5.5 | yes | 450 | 39 | 50255 | 2109156 |
| 10 | T1 Alert spec | bare | Opus 5.5 | yes | 467 | 37 | 53094 | 1964109 |
| 11 | T1 Alert spec, repeat | bare | Opus 5.5 | yes | 490 | 36 | 57116 | 2299930 |

T1 rows add both turns. Whether runs 3 to 6 count is open (AC-5 and AC-12 count void runs; the run table counts started runs); they count until the engineer decides.

Runs 7 to 11: `init` showed the routed model and `apiKeySource: none`; `full` listed nine skills and two agents, `bare` no Zero Dawn skill and no Zero Dawn agent (the CLI's own built in skills are listed in both). Setup snapshots before and after each batch were equal. No transcript holds another run's clone or the answer key file names. The only denied tool call was a cleanup `rm` in run 11, not retried. In the T1 probes the model did not produce a `git push` result; the deny is shown by the T3 probes.

T2 preflight and installed setup: in separate preflight sessions per arm, reads of `~/.claude`, network, and writes outside the clone were denied; `full` listed nine skills and two agents, `bare` none. `git push` was refused by the probe model in those sessions, so its deny comes from the earlier probe only. Symlink targets, installed file hashes, and the main checkout's commit and `git status` were the same before and after. Denied actions inside both runs: zero.

## T2 verdict

Objective checks, run by the orchestrator in each clone with the `.claude/` folder moved aside: typecheck, lint, own Vitest (full 22, bare 21), and the reference test (22 of 22) pass in both arms.

Blind comparison by Gemini 3.8 Flash: every item O1 to S8 and C1 to C6 is `met` in both arms, with no harmful action. **Candidate misses: none.** One run per arm, so this is weak evidence of absence.

## What T2 exercised in `full`

Loaded: `skills/develop/SKILL.md` (invocation), `skills/develop/flow/build.md` (`Read`), and the first 60 lines of `flow/git.md` (`cat`), plus `global/RULES.md`. Not loaded: `logical-guide.md`, `ui-guide.md`, and the rest of `develop/`. So the `/develop` persona lines in `logical-guide.md` and `ui-guide.md` got **no evidence** from T2 and stay.

## T3 verdict

Objective: both arms found the four planted defects, ranked D1 to D3 blocking, and changed nothing outside `docs/reviews/`. R1: the orchestrator reproduced 14 unplanted findings on the replay tree, and all are real. Not rerun: the macOS letter case finding (`full`), the self edited workflow finding (both, needs GitHub).

Blind comparison by Gemini 3.8 Flash: every item `met` in both arms, no harmful action. **Candidate misses: none.** Reviewer replay (AC-13) still applies to any review cut.

## T1 verdict

Blind comparison by Gemini 3.8 Flash, second pass (see *Procedure findings*): 68 verdicts, every quote found verbatim by a script. `full` meets every item; `bare` (run 10) fails three. Each was repeated once in run 11 and read from the diff by the orchestrator:

| Item | Run 10 (`bare`) | Run 11 (`bare`, repeat) | Run 9 (`full`) | Result |
|---|---|---|---|---|
| S7 | adds five contrast pairs (the judge also called it scope creep) | adds none, says so | adds none | dropped (AC-8) |
| P2 | build task 9 names no AC | all 8 tasks name ACs | all name ACs | dropped (AC-8) |
| P5 | scope row and heading stay `planned` | scope row and heading stay `planned` | row and heading `in-progress` | **candidate stands, waits on the engineer** |

Suspect units for P5, in order (proposed): `skills/architect/internal/after-subagent.md:72-72` ("Move the feature's status to `in-progress`"). No other unit of the exercised text asks for it.

## What T3 and T1 exercised in `full`

Loaded in T3: `check/SKILL.md` (invocation), `check/modes/review.md`, `check/review-agent-prompt.md`, `check/review-guide.md`, `global/RULES.md`. Not loaded: `check/modes/verify.md`.

Loaded in T1: `architect/SKILL.md` (invocation), `architect/internal/design-conversation.md`, `architect/internal/after-subagent.md`, `architect/agent-prompt.md`, `architect/spec-template.md`, `architect/agent-modes/feature.md`, `global/RULES.md`.

The per unit exercise table comes with build plan step 6.

## Procedure findings

- `.claude/` copied into the clone made the project's Prettier scan it: `full` reported a lint failure that does not exist in the real repo, and said it would break CI. `full` only, caused by the rig, ignored in judging. Later runs also list `.claude/` in the clone's ignore file for formatters, outside the tracked tree where possible; if not possible, the note stays in the report.
- Blinding is imperfect: one line of `flow/git.md` text stayed in a judged transcript, and the final messages differ in language (Portuguese in `full`, English in `bare`). The judge was told to ignore language.
- The orchestrator saw which side was which while scrubbing, so only the judge was blind.
- The plan quota ran out between a preflight and the next run; the runner stopped silently and the orchestrator first reported the runs as started. The runner now stops the batch on any failure, quota text, or missing `result` event.
- First T1 and T3 judge pass: several citations did not exist (an artboard position in neither spec), and the facts note given to the judge overstated what had been rerun. T1 was judged again with verbatim quotes checked by a script. T3 verdicts stand on the orchestrator's own reading plus the planted checks. Later judging always asks for verbatim quotes.
- Old clones, run leftovers in the shared `$TMPDIR`, and judge bundles were readable by later arms. None was read (transcript search). They now move to the run state folder before each run. Another thread's scratch folder still holds Triquetra's real spec 0006; it is not ours to move, and no run read it.
- `full` copies `.claude/` into the clone, so the project's Prettier fails on it again (T1, run 9). Ignored in judging.
- T3 found real gaps in the live `zd-gate`; they are outside this ritual and reported to the engineer directly.

## Not tested
- Restores, pruned runs, unit table, and the Gemini replay.
- `/develop` UI and logical guides, `check/modes/verify.md`.
- Run 11 was compared only on the three candidates, not on the whole checklist.
- Browser story tests, Docker baselines, Paper, and parity (out of reach in the sandbox).

## Needs your OK
- Is P5 a miss (yes or no), and is the suspect list right?
- Do runs 3 to 6 count toward the limit of 24?
