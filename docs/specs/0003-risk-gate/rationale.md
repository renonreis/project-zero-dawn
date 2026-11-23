# 0003. Rationale: Risk gate: a deterministic merge check for guarded areas

## Context

Zero Dawn runs projects with `autonomy: full`: agents branch, commit, push, open PRs, and `/sync` merges once the tier's checks pass. Every safety rule today is prose (`global/RULES.md`, skill text, the cross model review). Prose can be forgotten, misread, or lost when context is compacted, and the review reads the final diff, not the history: a key pasted in one commit and deleted in the next is invisible to it but lives in git forever.

The guarded surfaces are few and well known: secrets, the workflow's own rules (`AGENTS.md`, `CLAUDE.md`, `global/`, CI, the risk file itself), authentication, billing, and production migrations. Most changes touch none of them, so a check must cost nothing when nothing is touched and must be impossible for an agent to talk its way past when something is.

Constraints: the engineer works alone (no second human reviewer exists, so GitHub's "require approval from another person" cannot work); providers are Claude Pro and Antigravity only; Zero Dawn already runs `npm run check` on Node with zero dependencies; managed repos are mixed public and private, and some belong to other owners (Central Administrativa). Prior art proved the shape: a non AI gate reading a risk file, per commit, with trailer approvals.

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

## Rationale

The forces are autonomy without a second human and a toolchain kept to one runtime. Option 2 is the only one that gives a deterministic stop inside the exact step that merges (`/sync`) and a check the agent cannot skip (required CI), while reusing what Zero Dawn already runs. Shipping from Zero Dawn mirrors how skills already reach every project by symlink, so the gate improves everywhere at once, and the pinned SHA keeps CI reproducible.

Option 3 is a useful complement, not a substitute: its approval model assumes a team, and it cannot reason about areas or about history. Enabling secret scanning push protection where it is free stays a follow up. Option 1's runtime and drift costs buy nothing Option 2 lacks.

Trailers beat PR comments because they live in history, work offline, exist before a PR does, and are readable by the same script in CI. Their weakness (anyone who can commit can write one) is bounded by three things: the risk file itself is a guarded area, `RULES.md` already forbids acting without the engineer's word, and the agent writes the trailer only after an explicit yes in the conversation, always in the engineer's name.

