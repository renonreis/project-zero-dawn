# Frozen inputs: pruning ritual, first run (spec 0004)

- Setup commit: `041294c` (`origin/main`).
- CLI: Claude Code 2.1.325. Effort `high` in every arm.
- `protected-core.md`: approved by the engineer on 2026-11-24.
- `sandbox.json`: per spec 0004 *Isolation contract*, plus denies for cloud and session tools (an Opus 5.5 or Haiku 5.5 session lists them even with user settings off).
- `$TMPDIR` inside the sandbox is the shared `/tmp/claude-501`, so the transcript audit also looks for reads there.
- Not frozen yet: T1 and T3 inputs (build plan step 4).

## Arm rules file

`full`: `global/RULES.md` at the setup commit. `bare`: `protected-core.md`.

## Probe evidence (Haiku 5.5, 2026-11-24)

| Probe, `dontAsk` with `sandbox.json` | Result |
|---|---|
| `Write` outside the clone, `--allowedTools` with bare `Edit,Write` | written: violates AC-5 |
| Same, with `Edit(/**),Write(/**)` | denied, also from a subagent; writes inside the clone succeed |
| Bash write outside the clone | denied |
| Bash read of `~/.claude`, `Read` of the main checkout | denied |
| `git push`, network to npm | denied |
| Subagent events in the stream | present, with `parent_tool_use_id` |
