# Verify: scheduled loops · spec 0005 · updated 2026-11-24
_Steps derived from spec 0005 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones._

Use a scratch folder `S` for `--state` and `--run`, never the real state folder.

## UI / manual
- [ ] Run `docs/loops/weekly-retro.md` once on Sonnet 5.5 with `--state S` → PT-BR report with coverage, counts, 0 to 3 proposals with evidence, `Not tested`, `Needs your OK`; no GitHub write, no subagent → AC-1, AC-3, AC-9, AC-10, AC-12, AC-15
- [ ] Run `docs/loops/nightly-security.md` once on Gemini 3.8 Flash with a test registry (`--registry`) and `--state S` → findings by severity or "nothing found in what was covered", everything left out listed → AC-1, AC-7, AC-8, AC-15
- [ ] Put an instruction in a file of a throwaway repo used as test input → the report names it, nothing follows it → AC-1
- [ ] Paste the prompt in `docs/loops/README.md` in a new session after the merge → it clones `main` to a temporary folder and leaves the working checkout alone → AC-17
- [ ] `/check verify` twice on one day → `-verify-<slug>.md` and `-verify-<slug>-2.md`, first line `**Verdict**: ...`; a FAIL is saved too → AC-11
- [ ] `/check review` twice on one day → second file ends in `-2`; verify files do not count toward the round cap → AC-11
- [ ] `/sync` with an uncommitted verify file of this branch and one of another → commits the first, lists the second → AC-11
- [ ] Retro with the schedule created disabled → provider, model, and runtime mode in `scheduled_tasks` match AC-14 before enabling → AC-14, AC-16

## Commands
- [ ] `npm test` → all pass → AC-2, AC-4 to AC-10, AC-13, AC-18
- [ ] `npm run check` → passes, no hot path over 90% → AC-11
- [ ] `start retro` on the real registry → gate stops of PRs 17, 18, 19, and 23 are `needs-ok`, area `workflow`, later approved by `trailer` (window and retry attempts as source) → AC-9, AC-10
- [ ] Same evidence, Central Administrativa → counts and verdicts only, no path, title, branch, or log text (repo owner as source) → AC-13
- [ ] `start`, then create a branch on a covered repo or a commit in `--cwd`, then `check` → exit 1 naming it; a run with nothing changed prints `clean` (a `refs/t3/` ref is ignored) → AC-2
- [ ] `start nightly` with the real registry → no live project, `quiet: true`, nothing cloned → AC-4, AC-6
- [ ] Nightly state seeded 3 and 9 days back (`recordedAt` as source) → window covers 3 days, then 7 with `uncoveredGap` → AC-5
- [ ] Change the machine time zone (`TZ=Pacific/Auckland`) and run `start retro` → `reviewDays` follows the local day, no file counted in two runs → AC-9
- [ ] `finish` without `check`, with an empty report, and with an unwritable state folder → exit 3, state unchanged → AC-18
- [ ] A diff holding a fake key → key absent from `evidence.json` and the diff file, present as a secret finding → AC-8

## Acceptance-criteria coverage
- AC-1, AC-3, AC-12, AC-15: manual runs · AC-2: check command, tests · AC-4 to AC-8: nightly commands, tests · AC-9, AC-10, AC-13: retro commands, tests · AC-11: skill runs · AC-14, AC-16: schedule (after the engineer's yes) · AC-17: paste prompt · AC-18: finish, tests
