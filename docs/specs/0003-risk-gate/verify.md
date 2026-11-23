# Verify: risk gate · spec 0003 · updated 2026-11-23
_Steps derived from spec 0003 acceptance criteria. `/check verify` runs these; `/test` locks the durable ones (most already live in `scripts/zd-gate.test.mjs`)._

## Commands
- [x] `npm test` → 18 pass, 0 fail → AC-1 to AC-7, AC-9, AC-10
- [x] In a scratch repo on a branch that edits only `README.md`: `zd-gate main` → exit 0, "Nothing guarded was touched." → AC-1
- [x] Commit a fake cloud key, delete it in the next commit, add a `Risk-approved: secrets (...)` trailer: `zd-gate main` → exit 2, finding says "removed later, still in history", the key value is not printed → AC-2
- [x] Edit `AGENTS.md`: `zd-gate main` → exit 1 with the exact `git commit --allow-empty ... --trailer "Risk-approved: workflow (<name>)"` line → AC-3
- [x] Run that command with a name not in approvers → still exit 1; with the approver's name in other letter case → exit 0; edit `AGENTS.md` again → back to exit 1 → AC-4
- [x] Commit a fake key inside `.env.example` → exit 0 → AC-5
- [x] Remove `.zd/risk.json`: warning names `zd-gate init`; break its JSON → exit 3; `git clone --depth 1` then `zd-gate origin/main` → exit 3 mentioning shallow → AC-6
- [x] `zd-gate main --json` → JSON with `code` equal to the exit code → AC-7
- [ ] On a branch that merged a PR touching `global/RULES.md`, run `/sync` → it asks for the `workflow` OK and does not merge before the trailer exists → AC-8
- [x] `zd-gate init` in a fresh repo you own → writes `.zd/risk.json` (approver = `git config user.name`) and the workflow, keeps both on a second run, creates ruleset `zd-gate` once → AC-9
- [ ] Open a PR in an enrolled repo → check `zd-gate` runs with full history on Node 24, fails on exit 1, and the job summary lists trailer approvals → AC-10
- [ ] `/audit` on a project with `integration: on` → runs `zd-gate init` (asks first under `autonomy: confirm`) → AC-11
- [x] In Zero Dawn: a branch touching `skills/check/SKILL.md` only → exit 0; touching `global/RULES.md` → exit 1 → AC-12
- [x] `scripts/install.sh` → `~/.local/bin/zd-gate` links to `scripts/zd-gate.mjs`; `--uninstall` removes it → AC-13

## Value sources
- [x] Base ref: no arg picks `origin/main`; `zd-gate develop` uses `develop`; a missing ref exits 3
- [x] Rules source: a branch that deletes an area from `.zd/risk.json` while the base has it is still judged by the base copy (`rules from origin/main:.zd/risk.json`)
- [ ] Merge commits: a key added while resolving a conflict blocks; merging `main` into the branch does not report main's own changes
- [ ] Trailer name: with two approvers and `git config user.name` matching neither, `/sync` asks which name to write
- [x] Pinned SHA: `zd-gate init` in another repo while Zero Dawn `HEAD` is unpushed → exit 3 asking to push Zero Dawn first
- [x] Ownership: `zd-gate init` on a repo owned by someone else → files only, ruleset skipped with the owner named

## Acceptance criteria coverage
- AC-1 to AC-7: unit suite plus the command steps above · AC-8: `/sync` step · AC-9: init step · AC-10: PR check step · AC-11: `/audit` step · AC-12: Zero Dawn paths step · AC-13: installer step
