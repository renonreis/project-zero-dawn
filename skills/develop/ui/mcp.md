# UI Source: MCP

## Paper, Figma, or another design MCP source

Use this route when the spec or direct user answer says to pull the design from a connected design MCP. Paper is the engineer's default design tool (their design system lives there).

Paper: load its guide first (`get_guide`, topic `paper-mcp-instructions`), then `get_basic_info` for the file and artboards. Read exact values with `get_tokens`, `get_computed_styles`, `get_jsx`, and `get_fill_image`; never read sizes or colors from a screenshot (`get_screenshot` only compares your render to the frame). Never write to the Paper file from this skill.

Token source: when the project's `AGENTS.md` (`## Design sources`) or the spec names the code as the token source of truth, read token values from the code and take only layout, anatomy, and states from the design tool; a token that differs between them is drift to report, never a value to copy.

Pull the real design into `./design.md`: tokens, spacing, components, named frames, and any asset references. Use real values from the design source, not invented approximations. Record which file and frames were used in the report.

No MCP connected: say so, ask the engineer to connect it or pick another source. Do not silently switch to generated design.

After writing `design.md`, show a short summary, confirm the key tokens/source, then continue to `ui/implementation.md`.
