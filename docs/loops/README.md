# Scheduled loops

Prompts for the scheduled loops (spec [0005](../specs/0005-scheduled-loops/index.md)). Both only report. The T3 task holds nothing but this prompt, with `<loop>` replaced:

```text
You are GAIA running the scheduled loop <loop>. Note the current folder. Make a temporary folder with mktemp -d, then run git clone --depth 1 --branch main https://github.com/renonreis/project-zero-dawn.git <temporary folder>/zd. Read <temporary folder>/zd/docs/loops/<loop>.md and follow it exactly. If the clone fails, report that line and stop. Report only: change nothing else. Reply to the engineer in PT-BR.
```

| Loop | Title | Schedule (local) | Model |
|---|---|---|---|
| `weekly-retro` | `Weekly retro` | Monday 07:00 | `claudeAgent` · `claude-sonnet-5-5` |
| `nightly-security` | `Nightly security` | every day 03:00, only once a registry row is live | `antigravity` · `gemini-3.8-flash`, `thinking_level: high` |

Creating a schedule needs the engineer's yes. Create it from a thread on the loop's model, `bindToCurrentThread: false`, `freshSession: true`, `enabled: false`, full access. Confirm provider, model, and runtime mode (T3 database, table `scheduled_tasks`, read only; or the engineer in T3), then enable. After 2 failed runs in a row the engineer may move it to the fallback in spec 0005.
