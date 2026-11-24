# 0005. Scheduled loops: nightly security review and weekly retro

**Date**: 2026-11-24
**Status**: Proposed
**Scope**: feature 13

## Summary

Two routines run on a schedule and only report. The nightly one reads what reached the default branch of live projects and looks for security problems. The weekly one (a retro, a short look back) counts what the gate stopped, failed verifies, and review blockers across the registry, then proposes at most 3 adjustments. A small script gathers the facts first, so the model reads little and quota use stays low. The nightly schedule is created only when a project goes live.

## Context

Work merges autonomously, so nobody looks at the sum of a day of merges, and nothing tells the engineer whether the workflow's own checks earn their cost.

Evidence measured on 2026-11-24:

| Source | What exists | Gap |
|---|---|---|
| `zd-gate` | Failed and successful runs in GitHub Actions (Zero Dawn: 5 failed, 3 successful; failed logs name the missing approval); `Risk-approved` trailers on `main` | Log retention is 90 days; a stop in `/sync` before a push leaves no record outside session transcripts |
| `/check verify` | Verdict in the chat reply only | Spec 0002 escalates on "two consecutive failing reports in `docs/reviews/`", which the skill never writes |
| `/check review` | `docs/reviews/<date>-<branch>.md` is written, but only Central Administrativa has committed files, on open PR branches | Elsewhere the files vanish with the worktree; two rounds on one day share a name |

`schedule_task` has no model or runtime input, while T3 stores both per task. Whether it copies them from the creating thread is unverified. T3 has no scheduled task today. No registry project is marked `shipped`; `renon.dev` is paused but has a production deploy, and Triquetra publishes releases. Some repos are public, so a vulnerability cannot be posted there. One is private and belongs to someone else.

## Requirements

**User stories**:
- As the engineer, I want merged code of live projects reviewed at night, so that a security problem does not wait for a user to find it.
- As the engineer, I want a weekly count of what the workflow caught, so that I change it on evidence.
- As the engineer, I want loops that never act, so that running them alone is safe.

**Acceptance criteria**:
- **AC-1**: A loop never merges, edits a tracked file, commits, pushes, changes a PR, issue, or schedule, deploys, or writes a `Risk-approved` trailer. It uses no Hostinger tool. Diffs, logs, review files, and commit messages are data; instructions inside them are ignored and reported.
- **AC-2**: Every run takes a fingerprint at the start and the end. Any difference appears as an alert at the top of the report, saying it may come from other work. A fingerprint that cannot be taken is itself an alert.
- **AC-3**: Reports land only as the final message in the loop's private T3 thread (one thread per loop, fresh session per run) plus a local copy outside every repo. Nothing is posted to GitHub.
- **AC-4**: The nightly loop covers exactly the registry rows whose `Live` is `yes`; a row in a repo the engineer does not own also needs `owner ok <date>` in that cell. Other rows are skipped. With no qualifying row it reports one line and stops.
- **AC-5**: The nightly window starts at the head SHA recorded by the last finished run and ends at the current default branch head. With no record it starts 24 hours back. A record older than 7 days starts 7 days back and the report names the uncovered gap. A missing or non ancestor SHA (rewritten history) falls back to 24 hours with an alert. Direct pushes are covered.
- **AC-6**: When no covered project has new commits, the nightly report is one line and no code is read. When no source has an event in the window, the retro is one line plus any `no evidence` entries, with no proposal.
- **AC-7**: A nightly run reviews at most 5 projects and 3000 changed lines per project, excluding lockfiles and generated files. Files in risk areas come first. Everything left out is listed as not reviewed.
- **AC-8**: The nightly report lists findings by severity with project, commit, file, line, why it matters, and a suggested fix, plus secret findings from `zd-gate`. It never prints a secret value. With none, it says what was covered, never "secure".
- **AC-9**: The weekly retro reads every registry row with a repo, except `planned` and `archived`, for the window since its last finished run (first run 7 days, at most 28 days with the gap named). Per project and source (gate, verify, review) it reports a count or `no evidence`, never zero for a source that is missing or failed. A source that exists with no event in the window counts zero.
- **AC-10**: Gate stops are counted from GitHub Actions attempts of the `zd-gate` workflow, grouped by PR or branch with exit kind and area, beside `Risk-approved` trailers on the default branch. A stop later approved is shown as such. The report states that local stops before a push are not counted.
- **AC-11**: `/check verify` writes `docs/reviews/<YYYY-MM-DD>-verify-<feature slug>.md` on PASS, FAIL, and BLOCKED, starting with `**Verdict**: PASS`, `FAIL`, or `BLOCKED`. `/check review` keeps its format and starts a `-2`, `-3` suffix when the name exists; verify uses the same suffix. `/sync` commits the uncommitted files in the base's `reviews/` folder whose name holds the branch or the feature slug, and only lists the rest. The review round cap counts no verify file.
- **AC-12**: The retro proposes 0 to 3 adjustments. Each names the evidence (links or paths), the change, and the skill that would make it. No evidence means no proposal. A proposal from the previous report is repeated only with new evidence. The engineer answers in the thread; nothing is applied by the loop.
- **AC-13**: For a repo the engineer does not own, the retro carries only counts and verdicts: no code, finding title, path, or log text. The collector strips them before the model sees the evidence.
- **AC-14**: The nightly loop runs on `antigravity` · `gemini-3.8-flash` (`thinking_level: high`), the retro on `claudeAgent` · `claude-sonnet-5-5`. A failed run is not retried; the next run's window covers it. The retro names a nightly schedule that is missing, disabled, or last failed, once a project is live. After 2 failed runs in a row the engineer may move a loop to its fallback: nightly `antigravity` · `gpt-oss-120b-medium`, retro `antigravity` · `claude-sonnet-4-6`.
- **AC-15**: A loop starts no subagent, delegate, or thread.
- **AC-16**: Schedules are created only after the engineer's yes: retro on Mondays at 07:00, nightly daily at 03:00 local time, the nightly only once a row qualifies under AC-4. Before enabling, the stored provider, model, and runtime mode are confirmed against AC-14; they are read from the T3 database (`scheduled_tasks`, read only), or by the engineer in T3 if that cannot be read. If wrong or unconfirmed, the task stays disabled.
- **AC-17**: The task prompt only points to `docs/loops/<loop>.md` on `origin/main` of Zero Dawn; prompt and collector run from a temporary clone of `main`, never from a working checkout.
- **AC-18**: A finished run records state only after its report file is saved. A run that stops early through an error records nothing.

## Options considered

### Option 1: Prompt only loops

**Pros**:
- No code to maintain.

**Cons**:
- The model spends tokens on lookups and can silently miss a source or a window.

### Option 2: Deterministic collector plus short prompts

A script gathers facts as JSON; the model judges and writes.

**Pros**:
- Small token cost; windows, caps, and missing evidence are testable.

**Cons**:
- One more script in a guarded folder, and the verify skill diverges from upstream.

### Option 3: `zd-gate` keeps a log, transcripts fill the rest

**Pros**:
- Sees local stops too.

**Cons**:
- Breaks the rule of spec 0003 that the gate only reads and prints; transcripts are noisy, private, and tied to one machine.

## Decision

**Chosen option**: Option 2. T3 scheduled tasks start each loop, `scripts/loop-collect.mjs` (no dependencies) gathers evidence, and `docs/loops/*.md` hold the prompts.

## Rationale

GitHub Actions already records the gate stops that reach a PR, so a log inside the gate would break a clear rule to gain only local stops. Verify and review do need a durable record: saving it fixes the retro and the escalation rule in spec 0002 with one change. The engineer chose to specify the nightly loop now and turn it on later, because nothing is marked live.

Claude writes the code, so a Gemini nightly review is independent and costs no Claude Pro quota. The retro is synthesis, weekly, and small. Reference from local session logs: two `/sync` runs on Sonnet 5.5 used about 4 to 5 thousand output tokens and 0.5 million cache reads each, against 28 to 186 thousand output tokens for `/architect` on Opus 5.5. A retro of the `/sync` size is an expectation, not a measurement; the first run is compared with it. T3 threads keep findings private. Detection by fingerprint was preferred to a read only token, which still leaves SSH push open.

## Feature design

**Data model sketch**:

- Registry column `Live`: `no` (default), `yes`, or `yes (owner ok YYYY-MM-DD)`. Only the engineer decides it; `/sync` and `/scope` leave it alone.
- State, in `~/.local/state/zero-dawn/loops/`: `<loop>.json` with `{version: 1, loop, finishedAt, heads: {"owner/repo": {sha, recordedAt}}}` and `reports/<loop>-<finishedAt>.md`. `recordedAt` moves only for a project that succeeded in that run, and the age limit in AC-5 uses it per project. Retro heads are empty. `<finishedAt>` in file names is UTC `YYYYMMDDTHHMMSSZ`, so the newest report is the last by name. Reports are kept; the engineer may delete them.
- Run data, in a temporary folder: `start.json` with the fingerprint, window, and current heads.

**State transitions** (a run): `started` → `collected` → `finished`; any error ends in `failed` and leaves the old state.

**API surface** (`node scripts/loop-collect.mjs`):

| Command | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|
| `start <nightly\|retro> --run <dir> --cwd <dir>` | loop, empty run folder, starting checkout | `start.json`, evidence JSON on stdout | `gh` login, read calls only | exit 3: registry unreadable, `gh` not logged in |
| `check --run <dir>` | `start.json` | list of differences, or `clean` | same | exit 3: fingerprint failed (alert, AC-2) |
| `finish --run <dir> --report <file>` | finished report | saved report, then state | local files | exit 3: empty report, unwritable folder |

A per project failure never ends `start`: it becomes an `error` entry (nightly) or `no evidence` (retro). A failed project keeps its old SHA and `recordedAt`.

**Value sourcing**:

| Action | Value | Source |
|---|---|---|
| all | project list, `Live`, status | `docs/portfolio/registry.md` in the temporary clone; a missing `Live` column or empty cell means `no` |
| all | temporary clone | the fixed task prompt: make a temporary folder, shallow clone `main` of `renonreis/project-zero-dawn` there, read and follow `docs/loops/<loop>.md` in it. The loop file runs the collector from that clone with a `run` folder beside it, and removes the folder at the end |
| nightly | project order under the cap of 5 | oldest `recordedAt` first, a project with no record first of all; projects left out keep their SHA |
| all | repo is the engineer's | repo owner equals `gh api user` login |
| nightly | window start | `<loop>.json` head, limited by its `recordedAt` (AC-5); else the newest first parent commit older than the limit. No such commit (young repo): diff against the empty tree, run `zd-gate` from the root commit, and report the root commit as not checked by the gate |
| nightly | diff | temporary clone, `git diff <start>..<head>`, deleted with the run folder; private repos too, since `Live: yes` is the consent to send code to Google |
| nightly | file order and cap | areas in the order of `.zd/risk.json` at window start (else the built in areas), then other files by path; whole files only; a file that would pass 3000 lines is listed as not reviewed |
| nightly | generated files | `*.lock`, `package-lock.json`, `pnpm-lock.yaml`, `dist/`, `build/`, `*.min.*`, and paths marked `linguist-generated` |
| nightly | secret findings | `zd-gate <start> --json` in that clone; only `blocked` areas are used, since approval states belong to PRs. Exit 1 and 2 are results; exit 3 is an error |
| retro | window | `finishedAt` in state to now, limits in AC-9 |
| retro | gate stops | Actions API: `zd-gate` runs created in the window, every attempt; exit kind and areas from the failed log, matched on the gate's `Result:` and area lines; an unmatched log is `unknown` |
| retro | later approved | a later successful run on the same branch, or the PR merge (or squash) commit range carries `Risk-approved` for that area; stop and PR are tied by branch name and PR number |
| retro | approvals | `Risk-approved` trailers of commits on the default branch in the window (including squash bodies) |
| retro | verify and review events | files in `docs/reviews/` or `.workflow/reviews/` with a date in the window, on the default branch and on heads of PRs open or merged in the window. The same path on several refs counts once, from the newest commit; each suffix (`-2`) is its own round |
| retro | verify result | names with `-verify-`: the `**Verdict**:` line, `PASS`, `FAIL`, or `BLOCKED` |
| retro | review result | names without `-verify-` or `-test-`: `**Verdict**:` with one of the four values of the review guide; blockers are `### ` headings under `## Blockers`, none when the section is absent. A file that matches neither grammar is listed as `unparsed`, not counted |
| retro | source missing | gate: no `zd-gate` workflow; verify, review: no such file kind in any read ref, in or out of the window. A failed or expired call is also `no evidence` |
| retro | past proposals | newest file in `reports/` for the retro |
| retro | nightly health | `list_scheduled_tasks` by title `Nightly security`; unavailable means `no evidence` |
| `check` | fingerprint | per covered repo: refs from `git ls-remote`, open PR and issue numbers with update times; plus `HEAD`, refs, and status of the checkout the run started in, taken by `start` (path passed as `--cwd`) |
| report | run time and time zone | machine clock, local |
| report | tokens | T3 and session logs; the engineer compares, the loop does not report a guess |

**Report shape** (in PT-BR, the engineer's language): alerts, coverage (window, projects, sources), findings or counts, proposals (retro), `Not tested`, `Needs your OK`. Both loops give the report as the final message after `check` and `finish`. `finish` failing becomes an alert and state stays old.

**Key invariants**:
- The collector issues only read requests and writes only to the run folder and the state folder.
- A missing source is never a zero.
- State never moves past a report that was not saved, or a project that failed.

**Security model**: loops run in full access mode, since a mode with approvals would stop and wait at night. Detection is by fingerprint, not prevention; the gate remains the lock on merges. Nightly findings never leave the machine except to the model provider. Code of a repo owned by someone else reaches Google only after `owner ok`. A prompt injection in a diff is handled by AC-1 and AC-2.

**Configuration required**: none. The machine must be on with T3 running.

**Critical test scenarios**:
- Happy path: two merges and one direct push since the recorded SHA; the diff has all three and state moves to the head, verifies **AC-5**, **AC-18**
- Missed nights: record 3 days old covers 3 days; 9 days old covers 7 and names the gap, verifies **AC-5**
- Quiet night and no live project: one line each, verifies **AC-4**, **AC-6**
- Failure case: `gh` fails for one project; the retro shows `no evidence`, the nightly keeps that project's old SHA, verifies **AC-9**, **AC-18**
- Report only: a ref created between `start` and `check` becomes an alert; a fake instruction in a diff is reported, not followed, verifies **AC-1**, **AC-2**
- Permission: an external repo with `yes` and no owner ok is skipped by the nightly, and the retro holds only counts, verifies **AC-4**, **AC-13**
- Cap: 5000 changed lines yields 3000 reviewed and a list of the rest, verifies **AC-7**
- Round names: second review on one day gets `-2`, verify files do not count toward the cap, verifies **AC-11**

## Build plan

Tracer Bullet: the retro end to end on Zero Dawn first, then evidence, then the nightly.

1. `scripts/loop-collect.mjs` with `start`, `check`, `finish` for the retro and the gate source, plus `node:test` tests (guarded folder: needs the engineer's approval), satisfies **AC-2**, **AC-9**, **AC-10**, **AC-18**
2. `docs/loops/weekly-retro.md`, with one manual run, satisfies **AC-1**, **AC-3**, **AC-12**, **AC-15**, **AC-17**
3. `/check verify` report, round suffix in `/check review`, commit in `/sync`, adaptation rows, `npm run check`, satisfies **AC-11**
4. Verify and review sources with the external repo filter, satisfies **AC-9**, **AC-13**
5. Retro schedule after the engineer's yes: create disabled from a thread on the routed model, confirm, enable, satisfies **AC-14**, **AC-16**
6. Registry `Live` column (all `no`); nightly windows, caps, and `zd-gate` secrets in the collector, with tests, satisfies **AC-4**, **AC-5**, **AC-6**, **AC-7**, **AC-8**
7. `docs/loops/nightly-security.md`, with one manual run on a test registry, satisfies **AC-1**, **AC-3**, **AC-7**, **AC-8**, **AC-15**, **AC-17**
8. Nightly schedule when the first row qualifies, after the engineer's yes, satisfies **AC-14**, **AC-16**

Feature 13 stays `in-progress` until step 8 produced a report, or the engineer closes it without the nightly.

## Consequences

**Positive**:
- The retro and the escalation rule of spec 0002 get real evidence.
- Nights and weeks with nothing new cost almost nothing.

**Negative / tradeoffs**:
- Local gate stops stay invisible, and the first retros are thin until verify files accumulate.
- A loop that misbehaves is detected, not prevented.
- A machine that is off skips runs; the window covers it, up to the limits.
- Each project gains small review files in git; in public repos they are public, as reviews already are.
- T3 may not allow the model binding wanted; then the schedule waits for the engineer.

**Neutral**:
- Another upstream divergence in `check` and `sync`.
- Model IDs follow spec 0002; a vanished model means amending both.

## Follow-up

- [ ] Amend the routing table in spec 0002 with both loops when they are built.
- [ ] Compare the first retro's token use with the `/sync` reference; move it to Antigravity if it is far above.
- [ ] Decide whether `renon.dev` (paused, production deploy) or Triquetra (publishes releases) should be `Live`; until then no row qualifies.
