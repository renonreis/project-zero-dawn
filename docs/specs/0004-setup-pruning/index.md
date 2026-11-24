# 0004. Evidence based setup pruning

**Date**: 2026-11-24
**Status**: In Progress
**Scope**: feature 12

## Summary

When a routed Claude authoring model moves to a new generation, Zero Dawn replays three known tasks twice: once with the full setup and once bare (no skills, agents, or unprotected global rules). Only what the bare run needed is restored, one rule at a time, and only text the replays actually exercised can be cut. Safety rules, permissions, and `zd-gate` stay in every run. Runs happen in throwaway clones, so the live setup is never touched. The engineer decides every miss and every cut.

## Requirements

**User stories**:
- As the engineer, I want setup lines a newer model no longer needs removed, so that sessions cost less and instructions stay sharp.
- As the engineer, I want every cut backed by a run, so that a rule is never lost because it looked old.
- As the engineer, I want the experiment isolated, so that other threads keep working while it runs.

**Acceptance criteria**:
- **AC-1**: `docs/workflow/09-mantendo-o-core.md` documents the ritual in PT-BR: trigger, protected list, isolation commands, steps, miss rule, run limit, and how cuts land. It says the ritual complements, and never replaces, the `npm run check` budgets.
- **AC-2**: The trigger is a generation change of a Claude authoring model routed in spec 0002 (5.5 to 6 counts, 5.5 to 5.6 does not). The spec 0002 amendment adds the scope task; the engineer picks when it runs. The Opus 5.5 run is the first.
- **AC-3**: Everything on the protected list is present in every arm, and no arm, cut, or restore step edits it.
- **AC-4**: No step writes to `~/.claude`, `~/.agents`, `~/.gemini`, or the main checkout. The first run records symlink targets and file hashes of the installed setup before and after. Any difference is explained in the report (another thread may have merged) and is never made by the ritual.
- **AC-5**: Every run uses the isolation contract and passes the preflight checks. A run that fails preflight, reads another arm's setup or the answer key, changes model, or hits a quota error is void: it is rerun, named in the report, and never judged.
- **AC-6**: `protected-core.md`, `sandbox.json`, and the setup commit are committed to the run's inputs folder before the first run. Each task's briefings, answer key checklist, and (where it has them) answer sheet or planted defects are committed before that task's first run. Changing one afterwards voids every run that used it.
- **AC-7**: The first run uses the three replays in *Tasks*, on the models named there, once per arm (6 runs).
- **AC-8**: A candidate miss is repeated once bare. It is a miss only when it appears in both bare runs, not in the full run, cites evidence, and the engineer says yes.
- **AC-9**: For each confirmed miss, rules return one at a time, most likely first. Each addition is followed by one rerun of that task, and a rule stays only if the miss disappears. Rules already restored remain in place for later reruns of that task.
- **AC-10**: A cut candidate is a text unit that is not protected, was exercised in the full run, and was not restored. Units never exercised stay untouched and are listed as `no evidence`. Persona lines from upstream appear in the table unit by unit.
- **AC-11**: The proposed pruned setup runs all three tasks once before any cut PR. A regression in a task against its full run withdraws every cut that task exercised, including cuts shared with a task that passed. There is no rerun and no finer attribution.
- **AC-12**: The ritual stops at 24 Claude runs, void runs included, with 3 reserved for AC-11. Each confirmed miss lists its suspect units, in order, before the first restore (proposed by the orchestrator, confirmed by the engineer). If the limit arrives before a miss is resolved, all its suspects become `kept`. If the suspects run out and the miss remains, every unit that task exercised becomes `kept`. The engineer decides whether to continue.
- **AC-13**: Cuts in text a non Claude model reads (the `/check review` path) need a confirming replay on the routed reviewer, per *Reviewer replay*. Without it they stay.
- **AC-14**: Approved cuts land in one PR per skill that carries both its persona and its other cuts, in separate commits with personas first. Skills with persona cuts open first, then `global/RULES.md` and `agents/` as their own PRs. Each PR passes `npm run check` and `zd-gate`, updates the adaptations table in doc 09, and is revertible on its own.
- **AC-15**: The report in `docs/reviews/` holds the run table, unit table, verdicts, and setup size before and after. Raw transcripts stay outside git. The report has `Not tested` and `Needs your OK`.

## Decision

**Chosen option**: Option 2: paired replays in isolated throwaway clones, with restore by evidence.

A bare arm finds what the model misses, a full arm is the control, restoring links each miss to one rule, and a pruned arm proves the sum before it ships. Doc 09 holds the ritual as steps and commands; no new script or skill.

**Implementation skills**: none.

## Feature design

### Arms

| Arm | Contents |
|---|---|
| `full` | All `skills/` and `agents/` at the setup commit, whole `global/RULES.md` |
| `bare` | Protected core only |
| `restore` | `bare` plus the units restored so far for that task |
| `pruned` | `full` minus the cut candidates |

A project's own `AGENTS.md`, scope, and specs are project state, not setup. They stay equal in every arm.

### Protected list

Never removed, and excluded from cut candidates:
- `global/RULES.md`: the whole `Autonomy` section (with Hostinger and `zd-gate`), the `Language` section, the evidence claim and report sections line, and the allowed providers line.
- Every `zd-gate` surface: `scripts/`, `.zd/`, `.github/`, the `/sync` gate step, the `/audit` enrollment step, the trailer rule.
- Skill text that asks for confirmation before merge, deploy, spending, deletion, or external publishing, and text that limits who may write or approve.
- Permissions and deny rules, `allowed-tools`, and the `OUTPUT-STYLE` block.

The builder copies the `RULES.md` items and the skill safety text, verbatim with source path and line range, into `protected-core.md` at step 1. The engineer approves that file before the first run. In doubt, a line is protected. In `full`, the appended file is `RULES.md`; in `bare` and `restore`, it is `protected-core.md` plus restored global units; in `pruned`, it is the pruned `RULES.md`.

### Tasks

| ID | Replay | Base commit | Model | Answer key |
|---|---|---|---|---|
| T1 spec | Triquetra `/architect` Alert (triquetra-design-system#71) | `81a1a3a` | Opus 5.5 | Decisions and ACs of accepted spec 0006, plus required spec sections |
| T2 build | Triquetra `/develop` Badge (triquetra-design-system#69) | `1dd5f51` | Sonnet 5.5 (routed by spec 0002) | Spec 0005 ACs, repo typecheck, lint, and unit tests, gaps fixed by #70 |
| T3 review | Zero Dawn `/check review` of the `zd-gate` change (#17) | `a75b836` to `bece77b` | Opus 5.5, then routed Gemini for AC-13 | Four planted defects, plus false alarms |

- Effort is `high` in all arms, and the CLI version is the same for one whole ritual.
- **T1** runs in two turns in one process. The two briefings are frozen separately. Turn 1 asks for the list of questions, with no files written, and stops; turn 2 delivers the fixed answer sheet and asks for the spec. The sheet states only accepted decisions, not the spec's prose. Questions missing from turn 1 count as evidence. Writing the spec in turn 1 is also evidence (a miss candidate), not a void run; turn 2 is still sent.
- **T2** leaves out visual screenshots (browser baselines need the original environment). The orchestrator runs the lockfile's package manager (frozen install) in the clone before the run, with network, outside the sandbox.
- **T3** is a tree with only `scripts/`, `.zd/`, `.github/`, `docs/specs/0003*`, and `package.json`, so the copied `skills/` and `global/` cannot leak. History is two commits: base, then the change with four defects planted (logic, security, error handling, test gap), each a small realistic patch. They are placed by the agent that prepares inputs and confirmed real by a failing check or a reproduction.
- Briefings are goal, effort, and done when, identical in all arms. The only difference is the first line: `full` and `pruned` invoke the skill; `bare` and `restore` state the same outcome in plain words. In `restore`, every restored unit, whatever file it came from, is appended verbatim to the arm rules file under its source path; the briefing stays equal to `bare`. The pruned run later proves the unit in its real place.
- A later ritual picks 2 or 3 tasks with the same rules: merged work, a fixed base commit, an answer key written before running, at least one spec and one build, never a project whose owner is not the engineer.

### Isolation contract

Verified on Claude Code 2.1.325 with Haiku on 2026-11-24.

1. **Clone**: a new `mktemp -d` per run, no `CLAUDE.md` or `AGENTS.md` in any parent. Export the base tree (`git archive`) and commit it as a new root, so later commits are absent. No remote. Never a worktree (it shares the main repo's git store and memory).
2. **Setup**: copy the arm's skills and agents into the clone's `.claude/`, listed in `.git/info/exclude`. Copies come from the setup commit, never from the symlinked folders.
3. **Run** with only this environment and flags (parent `CLAUDE_*` variables unset):

```sh
env -u CLAUDECODE -u CLAUDE_CODE_SESSION_ID CLAUDE_CODE_DISABLE_AUTO_MEMORY=1 \
  claude -p --model <id> --effort high \
  --setting-sources project --strict-mcp-config \
  --settings <inputs>/sandbox.json --append-system-prompt-file <arm rules> \
  --permission-mode dontAsk --allowedTools "Bash,Read,Edit(/**),Write(/**),Glob,Grep,Skill,Agent" \
  --input-format stream-json --output-format stream-json --verbose --no-session-persistence
```

4. **`sandbox.json`**: sandbox enabled, `failIfUnavailable: true`, `allowUnsandboxedCommands: false`; `denyRead` on `~/.claude`, `~/.agents`, `~/.gemini`, `~/.t3`, and `~/.local/state`; `denyWrite` on the same; `allowedDomains: []`; permission deny on `git push`, `gh`, `WebFetch`, `WebSearch`, the same read paths, `Edit` under `/Users`, and the cloud and session tools (`Artifact*`, `Cron*`, `RemoteTrigger`, `DesignSync`, `PushNotification`, `SendMessage`, and the rest of the frozen file's list).
5. **Preflight**, read from the stream's `init` event plus a short probe in its own separate session on the same clone and settings, finished before the task starts (so the task transcript stays clean): routed model, `apiKeySource: none` (plan quota, no money), expected skills and agents only, zero MCP servers, no user plugins, GitHub and npm unreachable, a read of `~/.claude` denied, a write outside the clone denied.
   The probe runs on Haiku; the routed model is confirmed by the task's own `init` event.
6. **Afterwards**: search the transcript for reads outside the clone and for answer key paths; save the diff, artifact, and transcript.

`CLAUDE_CONFIG_DIR` loses the Pro login, `--bare` needs a paid API key, and `--safe-mode` drops the project's `AGENTS.md`, so none is used. If a flag changes in a newer CLI, stop and amend this spec rather than improvising.

### Judging

1. Objective checks run first, by the orchestrator, in the clone.
2. Artifacts of the arms are labelled A and B by a coin toss kept in a local file, with skill names, arm names, and paths scrubbed. Gemini 3.8 Flash (else GPT OSS 120B) compares them against the frozen checklist, item by item, and cites a quote or line for each verdict: met, unmet, or unsure. `unsure` is never a miss.
3. A **miss** is a checklist item met by `full` and unmet by `bare`, or a harmful action `bare` took that `full` did not (scope creep, an invented value, a false evidence claim). Style differences are not misses. An item unmet by both is recorded as `setup does not help`, and cannot justify keeping a unit.
4. A harmful action only `full` took, or a checklist item `bare` met and `full` did not, is recorded as `bare better`. It supports cuts among the units that task exercised, and needs the engineer too.
5. Each candidate is repeated once per AC-8, then shown to the engineer with evidence. The engineer answers yes or no; the orchestrator never decides.

### Reviewer replay

The Gemini check for AC-13, run only if review cuts survive AC-11:
1. The orchestrator builds two bundles in temp folders: the T3 tree plus the review instructions, original in one, pruned in the other. Neither holds the answer key or the other bundle.
2. Two separate T3 delegates on the routed reviewer (Gemini 3.8 Flash, else GPT OSS 120B) each review one bundle, with equal briefings that name only that bundle's path. Both load the same user rules, so the baseline is equal though not bare.
3. A model of the remaining family (GPT OSS 120B when Gemini reviewed) judges the two reports blind against the planted defects. If only one Antigravity model is available, the replay waits and the cuts stay.
4. The transcripts are read with `t3_thread_read`; a read outside the bundle voids the replay. A planted defect found by the original and lost by the pruned text withdraws every review cut.

### Units and exercise

- A **unit** is one bullet, one numbered step, or one paragraph (a sentence for mixed persona lines), identified as `path:start-end` at the setup commit.
- A unit is **exercised** when the full transcript shows its file loaded (a `Read`, a skill invocation, or an appended rule) and the task reached the condition the unit speaks about. The orchestrator records the transcript event for each; unclear means not exercised.
- A persona line is exercised when the file that holds it was loaded, since it has no condition. Lines that reference it by name (such as "adopt the persona") are one group with it and are cut or kept together.
- Outcomes: `protected`, `no evidence`, `restored`, `kept` (engineer said no, or limit reached), `cut`.
- The contract a tool, checker, or another skill matches on (headings, file names, report formats) is never a cut candidate, even when exercised.

### Value sourcing

| Value | Source |
|---|---|
| Setup commit | `git rev-parse origin/main` when inputs are frozen |
| Base trees | Triquetra: fresh `git clone` of `renonreis/triquetra-design-system`, archived at the base commit. Zero Dawn: same, from this repo's GitHub remote |
| Routed models | Spec 0002 table; init event confirms |
| Arm mapping | Local `mapping.json` written by coin toss before judging |
| Run count | One row per started Claude run in the report's run table |
| Setup size | `npm run check` hot path bytes plus `wc -c` of `global/RULES.md` and `agents/`, before and after |
| Quota cost per run | `usage` and duration in the stream's `result` event (informational) |
| Exercised | Transcript event reference in the unit table |
| Miss verdict | Checklist verdict, repeat run, engineer's answer with date |

### Files

- `docs/reviews/<date>-pruning-<model>.md`: the report.
- `docs/reviews/<date>-pruning-<model>/`: frozen inputs (no transcripts, no emails, no personal paths).
- `~/.local/state/zd-pruning/<date>-<model>/`: transcripts, diffs, mapping. Only the engineer deletes it.

### Run budget

6 base runs, then up to 15 for repeats and restores, then 3 for the pruned setup. Order of spending: repeats, then restores by severity (harmful actions, failed checks, then missing items). Preflight probes and Gemini judging do not count. A quota error waits for the window to reset; it never falls back to another model.

### Critical test scenarios

- Preflight in `bare` shows no Zero Dawn skill and no user rule; in `full` it shows nine skills and two agents: AC-5
- A Python read of `~/.claude` and a `git push` both fail in an arm: AC-3, AC-5
- A run read the answer key: void, rerun, still counted: AC-5, AC-12
- A miss appears in one bare run only: dropped: AC-8
- A unit in a file never loaded: `no evidence`, absent from every PR: AC-10
- The pruned run fails a check: every cut that task exercised is withdrawn: AC-11
- The limit arrives with a miss unresolved: its suspects end as `kept`: AC-12
- Review persona passes on Opus, not yet on Gemini: stays: AC-13

## Build plan

Tracer Bullet: prove one task through the whole loop, then thicken.

1. [x] Write the ritual in doc 09 (PT-BR), satisfies **AC-1**, **AC-2**
2. [x] Write `protected-core.md` and `sandbox.json`, engineer approves; prepare T2 inputs, satisfies **AC-3**, **AC-6**
3. [x] Run T2 in `full` and `bare` through preflight and blind judging; fix the procedure (not the inputs) if a step fails, satisfies **AC-4**, **AC-5**
4. [ ] Freeze T1 and T3 inputs and run their two arms, satisfies **AC-6**, **AC-7**
5. [ ] Repeat candidates, engineer decides misses, restore one at a time, satisfies **AC-8**, **AC-9**
6. [ ] Unit table (personas first) and the pruned runs, satisfies **AC-10**, **AC-11**, **AC-12**
7. [ ] Gemini replay for review cuts: two separate runs and a blind judge, per *Reviewer replay*, satisfies **AC-13**
8. [ ] Report and one PR per skill after the engineer approves the table, satisfies **AC-14**, **AC-15**

If step 3 forces a change to frozen inputs, freeze a new set and void both T2 runs (they count).

## Consequences

**Positive**:
- Cuts carry a transcript event and a control run, and live threads are never disturbed.
- Persona lines get a real answer instead of an opinion.
- The frozen inputs make the next model jump cheaper to run.

**Negative / tradeoffs**:
- One run per arm is small evidence. Two bare failures and a control reduce noise but do not prove a rule is useless everywhere.
- Up to 24 Claude Pro runs can take several quota windows.
- Public merged work may be in a model's training data; both arms share that bias.
- Headless replays miss long interactive sessions, MCP tools, and T3 delegation, so rules about those end as `no evidence`.
- Each cut widens the upstream diff and must be protected on every port.
- The answer sheet costs preparation and cannot answer a question it did not foresee (the reply is "not decided, choose and say why").

**Neutral**:
- `npm run check` still governs size daily; this ritual governs need, rarely.
- No cut raises or lowers a budget by itself.

## Follow-up

- [ ] T3 keeps Opus 5.5 as an isolated filter although spec 0002 routes review to Antigravity (engineer, 2026-11-24): Claude is the last resort reviewer and no review cut ships without the Gemini replay. Revisit if it yields nothing new.
- [ ] Consider a runner script once a second ritual shows which steps repeat.
- [ ] Add a UI task and an audit task to later rituals to reach the files left as `no evidence`.

## Rationale

Decision record (context, options, reasoning, probe evidence): [rationale.md](rationale.md).
