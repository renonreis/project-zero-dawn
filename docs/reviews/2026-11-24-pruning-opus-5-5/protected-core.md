# Protected core · pruning ritual (spec 0004)

Verbatim text at setup commit `041294c`, each block under its `path:start-end`. Present in every arm, never a cut candidate. In doubt, a line is protected.

### `global/RULES.md:9-9`

- Claim "works", "tested", or "fixed" only with the evidence beside it (test output, screenshot). End every work report with `Not tested` and `Needs your OK`, even when empty.

### `global/RULES.md:15-21`

## Autonomy
- Without asking: create GitHub repos, branch, commit, push, open PRs, merge.
- Announce every outward action as it happens and list them at the end of the reply (repo created, pushed, PR opened or merged, issue filed), each with its link, plus what now waits on the engineer.
- Write a `Risk-approved` trailer only after the engineer said yes to that area in this conversation, always in their name. Never bypass or weaken `zd-gate`.
- Always ask first: any deploy or release to an environment, anything that spends money, deleting repos or data, publishing outside GitHub.
- New repo: ask public or private, with a recommendation (most will be public).
- Hostinger is forbidden: never use Hostinger tools, MCP servers, skills, or APIs until the engineer lifts this rule in this file.

### `global/RULES.md:23-24`

## Language
- Talk to the engineer in PT-BR by default; switch only when the engineer writes their own message in another language. A briefing from GAIA, a bare slash command, or English context is not the engineer's language. End every launch or delegate briefing with "Reply to the engineer in PT-BR." Files agents read as contracts (`SKILL.md`, `AGENTS.md`, scope, specs, code, commits) are in English.

### `global/RULES.md:27-27`

- Providers: Claude Pro and Antigravity only; never GitHub Copilot. Routing, fallbacks, and IDs: https://github.com/renonreis/project-zero-dawn/blob/main/docs/specs/0002-model-routing.md (apply when launching or delegating).

### `skills/develop/SKILL.md:9-11`

<!-- OUTPUT-STYLE:START -->
Write everything this skill produces, files and messages alike, in plain simple language. Talk to the reader as `you`, warm and direct like a colleague, and present every step as a recommendation they may run or skip, never an order. Keep technical terms that carry real meaning; explain each in plain words. Never use a dash or a hyphen as punctuation: no em dash, no en dash, and no hyphenated compounds. Write `read only`, not `read-only`. Say it in simple words, or reword the sentence. Code, file paths, command flags, and values other skills match on keep their hyphens. Use short sentences, commas, or parentheses. Clear beats clever. Talk to the engineer in PT-BR unless they write their own message in another language; write every file you produce in English.
<!-- OUTPUT-STYLE:END -->

### `skills/develop/SKILL.md:21-28`

## Artifact ownership

- Writes app code (plus CSS/tokens for UI).
- Scope (`docs/scope/`): only the Step 4 touches (feature status → `in-progress`, milestone sub boxes, `Build it` box, code pointer). Marks a feature `done` only at the `Prototype` tier; at `Alpha`/`Beta`/`GA` it leaves it `in-progress` for `/check verify` and `/test`, and never ticks `Verify it` or `Test it`. Never creates files in `docs/scope/`.
- Never writes spec content or deliberates a decision (flags the need, defers to `/architect`); never restructures root `AGENTS.md` (`/audit`); new area conventions go via `/sync`. **One exception:** the Step 0 `Assumed` spec, the only spec `/develop` creates: assumption record fields only, no rationale, never advanced past `Assumed`.
- One spec touch on an existing spec: the `**Status**:` line (umbrella decision → the `index.md`'s, never a child's), plus filling the feature's spec pointer line. Build start: `Proposed` → `In Progress`; build lands (feature → `done`): `In Progress` → `Accepted` (a spec is not `Accepted` until its feature ships). Never edit spec content, only that line, surgically: read it again right before writing; unexpected state (already `Accepted`, `Superseded`) → flag, don't clobber. **Never move a spec out of `Assumed`** (ratification is `/architect`'s job), so it never reaches `Accepted` until ratified. It never blocks the feature's `done`.
- Artifact base: `docs/` by default, `.workflow/` if `docs/` is a published docs site. Read from whichever exists (paths here assume `docs/`).
- Shared scope: read it again right before ticking, edit only the specific checkbox, status, or pointer line (never rewrite the file); feature not as expected (already `done`, reworked) → flag, don't overwrite.

### `skills/test/SKILL.md:28-31`

## Artifact ownership

- Test files (`*.test.ts`, `*.spec.ts`, `test_*.py`, `*_test.go`, etc.), created by this skill
- `test-preferences.json` at the project root, created and maintained by this skill

### `skills/scope/SKILL.md:36-61`

## Artifact ownership

`docs/scope/` is the feature scope, owned by this skill; `/architect` owns `docs/specs/`. Other skills find a feature by scanning `docs/scope/` for its row. Living document: `plan`, `replan`, `add` all edit in place (reconcile and append, never a new dated file). Writes nothing else: no specs, code, or `AGENTS.md`. `docs/scope/` holds scope files only; inventories, analyses, research docs live with the spec in its `rationale.md` (owned by `/architect`).

File shape:
- Small product: one file, `docs/scope/scope.md` (At a glance table + phase grouped sections + legend).
- Large product: epic split: `docs/scope/index.md` (At a glance table across epics + one line status rollup per epic, each linking its epic file) + one file per epic named by area (`docs/scope/auth.md`, …).
- Promote on demand: start single file; when `scope.md` outgrows a comfortable scan (roughly a dozen plus features across clearly distinct areas), rename to `index.md` (keep table + per epic rollup), move each area's sections into its own `<epic>.md`. Never split it early. Names semantic (`scope.md` / `index.md` / `<epic>.md`), never numbered.
- Keep every file coarse and small; a long epic file needs finer features and tighter intent, not a build task dump.

Status lifecycle (`/scope` sets initial status; the pipeline advances it):
- New features start `planned`. Brownfield: also enroll features that are already there as `existing` (complete) or `in-progress` (partial), the only other statuses `/scope` writes.
- `/develop` advances pipeline built work (`planned` → `in-progress` → `done`); `/sync` reconciles against the diff. A feature built on an **assumed decision** (its governing spec is `Assumed`, recorded by `/develop` when the engineer chose to build before deciding) carries an `assumed decision (spec NNNN)` note until `/architect` ratifies the decision; the note does not block `done`, it is decision debt that stays surfaced until ratified.
- `done` ≠ `existing`: `done` = this pipeline built and verified it; `existing` predates the workflow; `/develop` and `/sync` never touch `existing` rows.
- `replan` may set a feature dropped from scope to `dropped`, never deletes rows; `dropped` keeps history, excluded from active counts and work; `/develop` and `/sync` skip it.

Workflow tier (one rigor dial per feature, `Prototype` · `Alpha` · `Beta` · `GA`): how much process a feature warrants. ONE project default (recommended once, plan Step 5b, recorded on the scope header `**Workflow:**` line) and a per feature override (a tag beside the heading, e.g. `· GA`, only when a feature differs from the default; no tag = inherit). What the tier drives:
- **Design time**: higher tier → more likely `Needs spec: yes`, and the spec's cross model decision critic runs (auto at `GA`/`Beta`). `Prototype`/`Alpha` features are often `Needs spec: no`.
- **After `/develop`** (the verification tail): `Prototype` = nothing (rely on `/develop`'s own build time self check); `Alpha` = `/check verify`; `Beta` = `/check verify` + `/test`; `GA` = adds a fresh model `/check review` + `/document`.
- **What closes `done`** (the last required stage marks it): `Prototype` → `/develop` (build + self check); `Alpha` → `/check verify`; `Beta`/`GA` → `/test`. An `Assumed` spec never blocks `done`; it stays flagged as owing ratification (`/architect`) at every tier.

`/scope` recommends the project default from the risk and size of the feature mix (Step 5b); `/develop` reads the effective tier (feature override, else project default, else inferred) to scale the next steps it recommends.

Artifact base: `docs/` by default; if `docs/` is a published docs site (`docusaurus.config.*`, `.vitepress/`, `mkdocs.yml`, Astro Starlight, or Nextra detected), use `.workflow/` (`.workflow/scope/…`). Always follow whichever base already exists (paths here assume `docs/`).

Concurrency: shared across sessions and teammates. Read again immediately before writing; surgical edits only (append rows in order, reconcile changed cells, never rewrite the file); flag rather than clobber unexpected state; append with the next free numbers so adders don't collide.

### `skills/document/SKILL.md:28-30`

## Artifact ownership

PR text, `CHANGELOG.md`, `docs/releases/`, `docs/postmortems/` (owned by this skill). It writes nothing else.

### `skills/audit/SKILL.md:39-41`

## Artifact ownership

The `AGENTS.md` files hold the content: create root if missing (Phase 1, 2) and `<area>/AGENTS.md` if missing and warranted, by judgment (Phase 2, 3, 4); when one exists, gap-fill or propose additions with permission; never overwrite. The `CLAUDE.md` files are pointers only (root and area), created if missing; a legacy one with content is migrated into `AGENTS.md` with permission. When creating a nested `AGENTS.md`, add exactly one pointer line to root `AGENTS.md` under `## Context files`: `- [<area>/AGENTS.md](<area>/AGENTS.md) (<one-line description>)`. Never one per subfolder, only where distinct conventions exist.

### `skills/architect/SKILL.md:62-77`

## Artifact ownership

Spec files in `docs/specs/`, created or updated by this skill only, plus any supporting evidence it produces (inventories, audits), which lives in the spec's `rationale.md` (directory spec) or inline (single file spec), never in the scope folder (`docs/scope/` is owned by `/scope`, not a spec).

Two independent choices, location (repo shape) and shape (decision size):

- **Location = repo shape.** Single repo → `docs/specs/`. Monorepo → `docs/specs/<workspace>/` for a workspace decision, `docs/specs/_root/` for a repo wide one (mirrors the scope). Numbering is per location (scan that dir for the next `NNNN`). Call the resolved location `$SPEC_DIR`.
- **Shape = decision size**, the same in any repo shape. Simple decision: one file `$SPEC_DIR/NNNN-title.md` (everything inline, written tight). An umbrella (related sub decisions), a heavy or foundational decision, or one that warrants a `verify.md` uses the directory shape: `$SPEC_DIR/NNNN-title/` with `index.md` as its top file plus a `rationale.md` beside it (and child specs `NNNN-<child>.md` for an umbrella). Never double the name (`NNNN-title/NNNN-title.md`); the directory carries the number, the top file is `index.md`. Default to a single file.

  A directory spec always has exactly two core files (plus optional `verify.md` and child specs):
  - **`index.md`**: the build spec `/develop` reads: `## Summary`, `## Requirements`, `## Decision`, the design/spec section, `## Build plan`, `## Consequences`, `## Follow-up`, and a one line `## Rationale` pointer to `rationale.md`. For an umbrella it also opens with a `## Structure` manifest listing and linking every child spec (one line each: what it is plus which decision it supports), and holds any cross child contract.
  - **`rationale.md`**: the decision record `/develop` skips: `## Context`, `## Options considered`, `## Rationale`, the `## References` section, and any bulky evidence (inventories, audits) under its own subheading. There is no `research/` folder; all evidence lives here.
  - Child specs (umbrella only) are flat `NNNN-<child>.md` files, each complete enough to build from on its own with a short inline rationale (not its own `rationale.md`); promote a child to its own directory only when it grows heavy. Cross child contracts live in the umbrella `index.md`.
- **One narrow exception into the scope:** after the spec is confirmed, update the matching feature to the ready to build shape (exact edits in *After the spec is written*, step 3). Never dump the atomic task list into the scope. No matching feature: offer to enroll one (see the derive tasks step).

**Artifact base.** specs live under `docs/` by default. If `docs/` is a published docs site (`docusaurus.config.*`, `.vitepress/`, `mkdocs.yml`, Astro Starlight, or Nextra detected), use `.workflow/` instead (`.workflow/specs/`). Always follow whichever base already exists (paths here assume `docs/`).

### `skills/sync/SKILL.md:44-48`

## Artifact ownership

Owns exactly what the Boundaries table grants and writes nothing else. As the **universal sub task reconciler** it ticks any scope sub task it can verify from repo evidence (sweeping the `/test`/`/audit`/`/sync` sub tasks other skills don't tick) and advances feature status; exact rules in `agent-prompt.md`.

**Artifact base.** specs and the scope live under `docs/` by default, or `.workflow/` if `docs/` is a published docs site; use whichever base exists in the repo (paths here assume `docs/`).

### `skills/debug/SKILL.md:25-27`

## Artifact ownership

Writes the **minimal code fix** for the root cause. Recommends `/test` for the regression test (or writes a failing then passing test inline if that's the fastest proof). Does **not** add features, refactor unrelated code, or rewrite the spec. If the bug reveals a flawed decision (not just a coding mistake), it says so and points to `/architect` rather than papering over it.

### `skills/check/modes/review.md:20-24`

## Artifact ownership

`docs/reviews/<YYYY-MM-DD>-<branch>.md`, created by this skill only. The subagent writes it; the main model relays a summary.

Artifact base: findings live under `docs/` by default. If `docs/` is a published docs site (`docusaurus.config.*`, `.vitepress/`, `mkdocs.yml`, Astro Starlight, or Nextra detected), use `.workflow/` instead (`.workflow/reviews/`). Always follow whichever base, `docs/` or `.workflow/`, already exists (paths here assume `docs/`).

### `skills/check/modes/verify.md:15-17`

## Artifact ownership

Owns no durable files. Chat output only (plus screenshots/logs saved to the scratch area). Does not write code (`/develop`), tests (`/test`), or context files.

### `skills/develop/flow/git.md:5-5`

Read the setting: `integration`, `branch prefix` (default `feat/`), `commit` (`per-milestone` default, `end-of-build`, or `manual`), `autonomy` (`confirm` default, or `full`). `autonomy: full` → branch, commit, and push without asking, saying what you did. Else local ops (branch, commit) are offers with a recommendation and **push and PR always confirm** (outward). PR is `/document`'s job, not this skill's. **Deploy always confirms**, at any autonomy.

### `skills/develop/flow/git.md:11-11`

- On the default branch (`main`/`master`) → **offer to branch** (recommended): `<prefix><feature-slug>` from the scope feature name (kebab case; e.g. `feat/accounts-sign-in`). Never build on the default branch.

### `skills/develop/flow/git.md:20-20`

- `manual` → never commit; the engineer does.

### `skills/develop/flow/git.md:30-30`

The why lives in the spec and the PR, never in the commit body (single source). Commit only what actually landed and typechecks; never commit a half done milestone. Push here only under `autonomy: full`; else `/document` pushes at PR time, confirmed.

### `skills/sync/SKILL.md:126-126`

- Before any merge, run the risk gate (`zd-gate` from the repo root; skip only if the command is missing, and say so). Exit `0`: go on. Exit `1`: ask the engineer per listed area; only after an explicit yes for that area, run the approval command it printed with the approver matching `git config user.name` (none matches: ask which name), push, and run the gate again. Exit `2` or `3`: stop, never merge, relay its report.

### `skills/sync/SKILL.md:127-127`

- `autonomy: full` in the `## Git` block, an open PR, the gate at `0`, and the effective tier's checks passed (CI green, if any): merge it (`gh pr merge --squash --delete-branch`) and say so. Else recommend the merge. Never deploy.

### `skills/audit/SKILL.md:98-98`

**Risk gate enrollment.** When the `## Git` block says `integration: on` and the `zd-gate` command exists, run `zd-gate init` at the repo root (under `autonomy: confirm`, or on a repo another person owns, ask first) and relay its lines in the report. It never overwrites an existing risk file.

### `skills/document/SKILL.md:86-86`

- **pr + gh**: only offer to create/update the PR via `gh` when **`GH_INSTALLED` and `HAS_REMOTE`**. If `PR_EXISTS`, the action is `gh pr edit` (update the body), **not** `gh pr create`. If gh isn't usable or no remote, the PR text is chat only, don't attempt `gh`. **Confirm before running `gh` and before any push** (opening/updating a PR is an outward action): show the body, then ask. Exception: `autonomy: full` in the `AGENTS.md` `## Git` block → push and create or update the PR without asking, then show the link. Otherwise the setting decides whether the workflow drives PRs at all (`integration: off` → produce the text, never push or open a PR unless the engineer asks here).

### `skills/test/SKILL.md:125-125`

All present → Step 6. Any missing → confirm first:

### `skills/test/writing-guide.md:15-15`

- Never create a second parallel test file for the same source, and never overwrite hand-written tests.

### `skills/audit/agent-prompt.md:23-23`

- Never overwrite an existing `AGENTS.md` (possibly authored by the user or another tool). Create only when missing; otherwise propose additions via the diff format.

### `skills/sync/agent-prompt.md:67-67`

- **Additive or corrective**: add a missing fact or fix a wrong one. Never delete curated guidance you don't fully understand.

### `skills/sync/agent-prompt.md:100-100`

- **Never overwrite or rewrite curated prose.** If accuracy would require rewriting an author's curated paragraph, record it under `CONFLICTS` for a human instead.
