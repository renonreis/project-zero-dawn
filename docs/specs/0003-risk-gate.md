# 0003. Risk gate: a deterministic merge check for guarded areas

**Date**: 2026-11-21
**Status**: In Progress
**Scope**: feature 11

## Summary

Zero Dawn ships a small Node script, `zd-gate`, that reads every commit of a branch and checks it against a risk file. A leaked secret blocks the merge outright. A change to guarded areas (workflow rules, auth, billing, production database) stops until the engineer says yes, and that yes is recorded as a commit trailer (a `Key: value` line at the end of a commit message). It runs in `/sync` before every autonomous merge and as a required GitHub Actions check, so safety no longer depends on an agent remembering a rule.

## Context

Zero Dawn runs projects with `autonomy: full`: agents branch, commit, push, open PRs, and `/sync` merges once the tier's checks pass. Every safety rule today is prose (`global/RULES.md`, skill text, the cross model review). Prose can be forgotten, misread, or lost when context is compacted, and the review reads the final diff, not the history: a key pasted in one commit and deleted in the next is invisible to it but lives in git forever.

The guarded surfaces are few and well known: secrets, the workflow's own rules (`AGENTS.md`, `CLAUDE.md`, `global/`, CI, the risk file itself), authentication, billing, and production migrations. Most changes touch none of them, so a check must cost nothing when nothing is touched and must be impossible for an agent to talk its way past when something is.

Constraints: the engineer works alone (no second human reviewer exists, so GitHub's "require approval from another person" cannot work); providers are Claude Pro and Antigravity only; Zero Dawn already runs `npm run check` on Node with zero dependencies; managed repos are mixed public and private, and some belong to other owners (Central Administrativa). Prior art proved the shape: a non AI gate reading a risk file, per commit, with trailer approvals.

## Requirements

**User stories**:
- As the engineer, I want an autonomous merge to stop when a branch touches a guarded area, so that I decide every risky change myself.
- As the engineer, I want a leaked secret to block the merge even if a later commit deleted it, so that I rotate the key instead of shipping it in history.
- As the engineer, I want changes that touch nothing guarded to merge without bothering me.

**Acceptance criteria**:
- **AC-1**: On a branch whose commits touch no area, `zd-gate` exits `0` and prints that nothing guarded was touched.
- **AC-2**: A commit that adds a line matching a secret pattern, or touches a guarded secret path, makes `zd-gate` exit `2` even when a later commit removes it. The report names the commit, file, line, rule, and whether the value is still in the final tree. No approval trailer changes this result.
- **AC-3**: A commit touching an `approve` area with no valid approval makes `zd-gate` exit `1`, listing the area, the files, who may approve, and the exact approval command.
- **AC-4**: A trailer `Risk-approved: <area id> (<name>)` counts only when `<name>` matches an approver of that area (case insensitive) and the trailer sits in the latest commit that touched the area or a later one. With every touched area approved and nothing blocked, `zd-gate` exits `0`.
- **AC-5**: A path listed in an area's `except` never triggers that area, for path rules and content rules alike.
- **AC-6**: The rules come from the base ref's `.zd/risk.json` when the base has one, so a branch cannot loosen the rules that judge it; the branch's own copy applies only when the base has none (first enrollment, with a warning). With no `.zd/risk.json` anywhere, the built in defaults (secrets, workflow) apply and a warning recommends `zd-gate init`. An invalid risk file, a missing base ref, a non git folder, a shallow clone without the merge base, a git older than 2.36, or a Node without glob support makes `zd-gate` exit `3` with a plain message.
- **AC-7**: `zd-gate --json` prints the same result as JSON with the same exit code.
- **AC-8**: `/sync` runs `zd-gate` before any merge. Exit `0`: merge as today. Exit `1`: stop, ask the engineer per area; after an explicit yes, write the trailer commit with the engineer's name, push, run the gate again, then merge. Exit `2`: stop, never merge, show the fix. Exit `3`: stop, never merge, show the error.
- **AC-9**: `zd-gate init` writes `.zd/risk.json` (default areas, approver from `git config user.name`) and `.github/workflows/zd-gate.yml`, never overwriting an existing file. On a repo the engineer owns whose plan supports it, it sets the `zd-gate` check as required on the default branch; otherwise it says why it skipped.
- **AC-10**: The CI workflow (job named `zd-gate`) runs the gate from Zero Dawn pinned to a commit SHA on every pull request, with `actions/checkout` at `fetch-depth: 0` and `actions/setup-node` on Node 24, fails the check on any exit other than `0`, and lists in the job summary every area that passed by trailer (area, name, commit).
- **AC-11**: `/audit` runs `zd-gate init` when it enrolls a project (under `autonomy: confirm`, it asks first).
- **AC-12**: Zero Dawn's own risk file guards `global/`, `scripts/`, `.zd/`, `.github/`, `AGENTS.md`, and `CLAUDE.md`, and does not guard `skills/`.
- **AC-13**: `scripts/install.sh` links `zd-gate` into `~/.local/bin`; `--uninstall` removes that link.

## Options considered

### Option 1: Adopt an existing script as is (Bun, YAML, copied per project)

Copy an existing script and YAML risk file into every repo and run it with Bun.

**Pros**:
- Already written and battle shaped; YAML allows comments.

**Cons**:
- Adds a second runtime on this machine and in every CI job.
- Copies drift: a fix must be pasted into every repo.
- Third party code that is not ours to redistribute in public repos; Portuguese keys break the English contract rule.

### Option 2: Zero Dawn ships a Node gate with zero dependencies

One script in Zero Dawn, linked as `zd-gate` by the installer; each project keeps only `.zd/risk.json`; CI fetches the script from the public Zero Dawn repo at a pinned commit.

**Pros**:
- Same runtime as `npm run check`; nothing to install per project.
- One fix updates every project locally; CI upgrades are an explicit SHA bump.
- Built in defaults protect a project before it is enrolled.

**Cons**:
- JSON has no comments, so each area carries a `why` field instead.
- Needs Node 22 or newer for `path.matchesGlob`.
- CI depends on the Zero Dawn repo staying public.

### Option 3: GitHub native controls only

Secret scanning push protection, CODEOWNERS, and branch protection.

**Pros**:
- No code to maintain; push protection stops many secrets before they land.

**Cons**:
- CODEOWNERS approval needs a second person; a solo engineer cannot approve their own PR.
- No per area approval record and no view of deleted lines in history.
- Push protection and rulesets are limited on private repos on the free plan.

### Option 4: Keep prose rules only

The status quo: `RULES.md`, skill text, and the review.

**Pros**:
- Zero work.

**Cons**:
- Exactly the failure mode this feature exists to remove: an autonomous agent can forget, and the review never sees deleted history.

## Decision

**Chosen option**: Option 2: Zero Dawn ships a Node gate with zero dependencies.

`scripts/zd-gate.mjs`, linked as `zd-gate`, checks every commit since the merge base against `.zd/risk.json` (or built in defaults); `/sync` and a required GitHub Actions check both run it, and approvals are `Risk-approved` trailers.

## Rationale

The forces are autonomy without a second human and a toolchain kept to one runtime. Option 2 is the only one that gives a deterministic stop inside the exact step that merges (`/sync`) and a check the agent cannot skip (required CI), while reusing what Zero Dawn already runs. Shipping from Zero Dawn mirrors how skills already reach every project by symlink, so the gate improves everywhere at once, and the pinned SHA keeps CI reproducible.

Option 3 is a useful complement, not a substitute: its approval model assumes a team, and it cannot reason about areas or about history. Enabling secret scanning push protection where it is free stays a follow up. Option 1's runtime and drift costs buy nothing Option 2 lacks.

Trailers beat PR comments because they live in history, work offline, exist before a PR does, and are readable by the same script in CI. Their weakness (anyone who can commit can write one) is bounded by three things: the risk file itself is a guarded area, `RULES.md` already forbids acting without the engineer's word, and the agent writes the trailer only after an explicit yes in the conversation, always in the engineer's name.

## Feature design

**Data model sketch** (`.zd/risk.json`, one per project; the built in defaults use the same shape):

| Field | Type | Required | Notes |
|---|---|---|---|
| `version` | number | yes | `1`; any other value is exit `3` |
| `approvers` | string[] | yes | names as they will appear in trailers; init seeds `git config user.name` |
| `areas` | Area[] | yes | at least one |
| Area `id` | string | yes | lowercase kebab, unique in the file; used in trailers |
| Area `name` | string | yes | human label |
| Area `why` | string | yes | shown when the area stops a branch |
| Area `onTouch` | `"block"` \| `"approve"` | yes | `block` accepts no approval |
| Area `fix` | string | for `block` | what to do (rotate, remove, rewrite history) |
| Area `paths` | glob[] | one of `paths`/`content` | matched against every path a commit added, changed, or deleted (renames count as delete plus add); normalized on load, gitignore style: a pattern ending in `/` becomes `<pattern>**`, a pattern with no `/` becomes `**/<pattern>`; then `path.matchesGlob` |
| Area `except` | glob[] | no | paths this area ignores, for both rule kinds; normalized like `paths` |
| Area `content` | `{name, pattern, flags?}`[] | one of `paths`/`content` | JavaScript regex tested against each added line of text files |
| Area `approvers` | string[] | no | subset of top level `approvers`; defaults to all of them |

Approval record: an empty commit whose message carries `Risk-approved: <area id> (<approver name>)`. The report prints it as `git commit --allow-empty -m "Risk approval" --trailer "Risk-approved: <area id> (<name>)"`, with `<name>` filled in when the area has exactly one approver and left as `<name>` otherwise.

Finding record: `{commit (short sha), file, line?, rule, stillInFinalTree?}`. Path findings carry no `line`. For content findings, `stillInFinalTree` is true when the same file and added line text also appear among the added lines of `git diff <merge-base>...HEAD`. The matched value is never printed or stored in the output. Default areas shipped in the script: `secrets` (block: env files, key files, credential JSON, plus common token formats), `workflow` (approve: `AGENTS.md`, `CLAUDE.md`, `.claude/`, `.zd/`, `.github/workflows/`, `.githooks/`), `auth`, `billing`, `prod-db` (approve: conventional folder and file names, migrations, destructive SQL). Content patterns are written fresh in English for common public token formats (private key headers, cloud access keys, Git host tokens, payment live keys, chat app tokens, AI provider keys, passwords in connection URLs, hard coded credential assignments).

**State transitions** (per touched area, per run): `untouched` (no finding) · `blocked` (any finding in a `block` area) · `needs-ok` (finding, no valid trailer) · `approved` (valid trailer at or after the latest touching commit). A new commit touching an approved area moves it back to `needs-ok`. Overall exit: any `blocked` → `2`; else any `needs-ok` → `1`; else `0`; any error → `3`.

**API surface** (CLI):
| Command | Inputs | Outputs | Auth | Key errors |
|---|---|---|---|---|
| `zd-gate [base]` | base ref (opt), `--risk <path>` (opt) | report text; exit `0/1/2/3` | local git | exit `3`: not a repo, base missing, shallow clone, bad risk file, Node < 22 |
| `zd-gate --json [base]` | same | JSON `{base, commits, areas[{id, state, findings[], approvers, approvedBy?}], warnings[], code}` | local git | same |
| `zd-gate init` | `--force-ci` (opt, rewrites only the workflow) | writes `.zd/risk.json`, `.github/workflows/zd-gate.yml`; may set required check | `gh` auth for protection | file exists (skips that file, says so); protection unsupported (skips, says why) |
| `/sync` step 3.5 | gate exit code | merge, ask, or stop | engineer's yes for trailers | exit `2`/`3` never merge |

**Value sourcing**:
| Action | Value | Source |
|---|---|---|
| `zd-gate` | base ref | CLI arg; else first existing of `origin/main`, `origin/master`, `main`, `master`; in CI `origin/${{ github.base_ref }}` |
| `zd-gate` | commit range | `git merge-base <base> HEAD` to `HEAD` |
| `zd-gate` | files and added lines per commit | `git log --no-renames --name-only` and `git log -p --unified=0 --no-renames --diff-merges=remerge` over the range (merge commits show only what their conflict resolution added; needs git 2.36 or newer, else exit `3`) |
| `zd-gate` | "still in final tree" | added lines of `git diff <merge-base>...HEAD` |
| `zd-gate` | areas and approvers | `--risk` if given; else `git show <base>:.zd/risk.json`; else the working tree `.zd/risk.json` (first enrollment, warned); else built in defaults |
| `zd-gate` | approvals | `Risk-approved` trailers in commit bodies of the range |
| `/sync` | the engineer's yes | the engineer's explicit answer in this conversation, per area; never inferred |
| `/sync` | trailer name | the area approver equal (case insensitive) to `git config user.name`; if none matches, the engineer names one in the same question that asks for the OK |
| `zd-gate init` | approver | `git config user.name` |
| `zd-gate init` | pinned Zero Dawn SHA | `HEAD` of the installed Zero Dawn checkout, only if `origin` contains it (else exit `3`: push Zero Dawn first) |
| `zd-gate init` | owner and plan support | `gh repo view --json owner,visibility,viewerPermission`; protection only with admin permission, and on private repos only when the API accepts it |
| `zd-gate init` | required check | a repository ruleset named `zd-gate` (via `gh api repos/<owner>/<repo>/rulesets`) targeting the default branch and requiring the status check `zd-gate`; additive, so existing branch protection and rulesets are never read or changed; skipped if a ruleset with that name already exists |

**Key invariants**:
- A `block` area never resolves to anything but `blocked` while its finding is in the range.
- An approval only counts in or after the latest commit that touched its area.
- The gate never writes, commits, pushes, or rewrites history; it only reads git and prints.
- `/sync` never merges on any exit other than `0`.
- `init` never overwrites an existing risk file.

**Security model**: the gate reads the local repo only; no network except `init` calling `gh`. Trailers are a record, not a cryptographic lock: locally, anyone who can commit can write one; the required CI check plus the guarded risk file and `RULES.md` bound that. Checking the trailer commit's author email was considered and rejected (agents commit under the engineer's identity, so it proves nothing), as was requiring a GitHub PR approval (a solo engineer cannot approve their own PR); instead the CI job summary lists every trailer approval so the engineer can spot one they never gave. A branch is always judged by the base ref's rules, and in Zero Dawn CI by the base ref's copy of the gate script, so a PR cannot weaken the gate or drop an area to pass itself. Agents write a trailer only after the engineer's explicit yes in the current conversation, naming the engineer, never themselves. On a repo owned by someone else (or `autonomy: confirm`), `init` writes files only after asking and never changes branch protection. Secret findings print file and line, never the matched value.

**Configuration required**: none (no env vars). CI needs read access to the public Zero Dawn repo.

**Critical test scenarios**:
- Happy path: a branch editing only `README.md` exits `0`, verifies **AC-1**.
- Failure case: commit A adds an AWS style key, commit B deletes it; exit `2`, report says "removed later, still in history", and an added trailer for `secrets` changes nothing, verifies **AC-2**.
- Approval timing: trailer for `workflow` before a later `AGENTS.md` edit is ignored (exit `1`); a trailer after it passes (exit `0`); a trailer with a name not in approvers is ignored, verifies **AC-3**, **AC-4**.
- Exceptions and globs: `.env.example` with a fake key does not trigger `secrets`; `apps/web/.env` does (bare name matches at any depth); `global/RULES.md` triggers `global/`, verifies **AC-2**, **AC-5**.
- Merge commits: a conflict resolution that adds a key inside a merge commit exits `2`; merging `main` into the branch does not report main's own changes, verifies **AC-2**, **AC-1**.
- Errors: shallow clone and malformed JSON both exit `3`, verifies **AC-6**.
- Merge guard: `/sync` on a branch touching `global/RULES.md` asks, and does not merge before the trailer exists, verifies **AC-8**, **AC-12**.

## Build plan

Tracer Bullet: prove the whole loop on Zero Dawn first (gate, `/sync`, CI), then thicken.

1. [x] `scripts/zd-gate.mjs`: argument parsing, Node and repo checks, base resolution, per commit file and added line extraction, built in `secrets` and `workflow` defaults, area evaluation, trailer parsing, text and JSON output, exit codes, satisfies **AC-1**, **AC-2**, **AC-3**, **AC-4**, **AC-5**, **AC-6**, **AC-7**
2. [x] Tests with `node:test` that build throwaway git repos in a temp dir for each scenario above; `npm test` script, satisfies **AC-1** to **AC-7**
3. [x] Zero Dawn's own `.zd/risk.json` and `.github/workflows/zd-gate.yml` (gate run from the checkout itself here), satisfies **AC-10**, **AC-12**
4. [x] Installer: link `~/.local/bin/zd-gate`, unlink on `--uninstall`, satisfies **AC-13**
5. [x] `/sync` step 3.5 and `global/RULES.md` trailer rule (only after an explicit yes, engineer's name), keeping `npm run check` budgets under 90%, satisfies **AC-8**
6. [x] Remaining defaults (`auth`, `billing`, `prod-db`) and `zd-gate init` (risk file, pinned CI workflow, required check with skip reasons), satisfies **AC-9**, **AC-10**
7. [x] `/audit` enrollment calls `zd-gate init`, satisfies **AC-11**
8. Pilot: run `init` on Triquetra Design System and merge one real PR through it, satisfies **AC-8**, **AC-9**, **AC-10**

## Consequences

**Positive**:
- Autonomous merges get a hard stop that does not depend on any model's memory.
- Secrets deleted in a later commit are still caught.
- Branches that touch nothing guarded pay a few seconds and no questions.

**Negative / tradeoffs**:
- Every change to workflow rules (in every project) waits for the engineer; Zero Dawn PRs touching `global/` or `scripts/` stop at `/sync`.
- A local trailer can be forged by anyone with commit access; the required CI check is the real lock, and it is unavailable on some private repos on the free plan.
- Content patterns catch common formats only; an unusual secret can slip through.
- CI pins a SHA, so gate fixes reach CI only when a project's workflow is bumped.
- A new path exception (for a false positive) takes effect only after it merges, so it ships in its own approved PR before the branch it unblocks.
- Squash merges collapse trailers into the merge commit body; history on main keeps them only as text.

**Neutral**:
- Gate scripts need Node 22 or newer and git 2.36 or newer (CI uses Node 24); `npm run check` keeps working on older Node.
- New adaptation row in `docs/workflow/09-mantendo-o-core.md` for the `/sync` and `/audit` changes.

## Follow-up

- [ ] Turn on GitHub secret scanning push protection on public repos (free complement to the `secrets` area).
- [ ] A `zd-gate init --bump` path to update the pinned SHA in a project's workflow.
- [ ] Revisit the change size axis (scope feature 14) once the gate reports which areas real PRs touch.
- [ ] Nightly security loop (scope feature 13) can call `zd-gate <sha from 24 hours ago>` once this ships.
