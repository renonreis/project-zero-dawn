# Scope Mode: replan

## Replan (the living rhythm, run after a feature or phase ships)

Run each time a feature or phase lands. Reconcile in place, surgically (reconcile cells, append rows, never a new file or a rewrite).

1. Read the whole scope again (single file, or `index.md` + epics; the workspace's in a monorepo) and the code/specs for what just shipped.
2. Reconcile what shipped: mark completed features `done` (verify from code/spec, don't stamp); tick nothing unconfirmed; leave rows `/develop`/`/sync` already advanced. A feature with an `Assumed` spec keeps its `assumed decision (spec NNNN)` note (it never blocks `done`); list it in the readout and report as "built, awaiting ratification (spec NNNN)" pointing to `/architect <feature>`.
3. Enroll needs surfaced during the build: read shipped features' spec `## Consequences` and `## Follow-up` sections; a follow-up (e.g. "add rate limiting") not yet a scope row becomes a new `planned` row with intent, tier, `Needs spec?`; the scope grows from real build feedback.
4. Reprioritize / reorder: sequence `Order` again, adjust `Phasing` for work not yet built; foundations stay first; work dropped from scope → `dropped`. If the project's risk profile has clearly shifted (e.g. payments or auth were added), recommend the `**Workflow:**` default again via the plan Step 5b panel; otherwise leave it.
5. Queue the next slice: which feature(s) are next (lowest `Order` `planned` rows), each `Needs spec: yes` (→ `/architect` next) or `no` (→ `/develop`).
6. Report via the completion block (mode: replan): marked done, enrolled from spec follow-up items, reordered/dropped, next step.
