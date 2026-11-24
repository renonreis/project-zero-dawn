# Rationale: 0005 scheduled loops

Decision record for [index.md](index.md).

## Context

Work merges autonomously, so nobody looks at the sum of a day of merges, and nothing tells the engineer whether the workflow's own checks earn their cost.

Evidence measured on 2026-11-24:

| Source | What exists | Gap |
|---|---|---|
| `zd-gate` | Failed and successful runs in GitHub Actions (Zero Dawn: 5 failed, 3 successful; failed logs name the missing approval); `Risk-approved` trailers on `main` | Log retention is 90 days; a stop in `/sync` before a push leaves no record outside session transcripts |
| `/check verify` | Verdict in the chat reply only | Spec 0002 escalates on "two consecutive failing reports in `docs/reviews/`", which the skill never writes |
| `/check review` | `docs/reviews/<date>-<branch>.md` is written, but only Central Administrativa has committed files, on open PR branches | Elsewhere the files vanish with the worktree; two rounds on one day share a name |

`schedule_task` has no model or runtime input, while T3 stores both per task. Whether it copies them from the creating thread is unverified. T3 has no scheduled task today. No registry project is marked `shipped`; `renon.dev` is paused but has a production deploy, and Triquetra publishes releases. Some repos are public, so a vulnerability cannot be posted there. One is private and belongs to someone else.

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

## Rationale

GitHub Actions already records the gate stops that reach a PR, so a log inside the gate would break a clear rule to gain only local stops. Verify and review do need a durable record: saving it fixes the retro and the escalation rule in spec 0002 with one change. The engineer chose to specify the nightly loop now and turn it on later, because nothing is marked live.

Claude writes the code, so a Gemini nightly review is independent and costs no Claude Pro quota. The retro is synthesis, weekly, and small. Reference from local session logs: two `/sync` runs on Sonnet 5.5 used about 4 to 5 thousand output tokens and 0.5 million cache reads each, against 28 to 186 thousand output tokens for `/architect` on Opus 5.5. A retro of the `/sync` size is an expectation, not a measurement; the first run is compared with it. T3 threads keep findings private. Detection by fingerprint was preferred to a read only token, which still leaves SSH push open.
