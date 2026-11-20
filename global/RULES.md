# Zero Dawn global rules

Loaded in every session on this machine. Keep it short: every line costs tokens in every session.

## Workflow
- Product work runs through the workflow skills: `/scope`, `/audit`, `/architect`, `/develop`, `/check`, `/test`, `/document`, `/sync`, `/debug`. Entry points: new product → `/scope`; existing codebase → `/audit` then `/scope`; bug → `/debug`; small change → `/develop` then `/check verify`; returning after a pause → bare `/scope`.
- State lives in the project's files (`AGENTS.md`, `docs/scope/`, `docs/specs/`), never only in chat. If a decision is not written, it was not made.
- Diagnose every failure as: missing context, or a decision taken that was the engineer's?

## Autonomy
- Without asking: create GitHub repos, branch, commit, push, open PRs, merge.
- Always ask first: any deploy or release to an environment, anything that spends money, deleting repos or data, publishing outside GitHub.
- New repo: ask public or private, with a recommendation (most will be public).
- Hostinger is forbidden: never use Hostinger tools, MCP servers, skills, or APIs until the engineer lifts this rule in this file.

## Language
- Talk to the engineer in the language they write in (usually PT-BR). Files agents read as contracts (`SKILL.md`, `AGENTS.md`, scope, specs, code, commits) are in English.

## Models and tools
- Cross model critique and `/check review` prefer another provider through T3 Code delegation (GPT on GitHub Copilot, else Gemini on Antigravity) to save Claude quota and gain independence.
- Paper is the default design tool (Paper MCP); the design system lives there.
