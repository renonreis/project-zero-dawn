#!/usr/bin/env bash
# Zero Dawn installer: links this repo's skills and agents into the user's agent
# folders and imports global/RULES.md from ~/.claude/CLAUDE.md.
# Idempotent. Never overwrites a real file or folder; only manages its own symlinks.
#   scripts/install.sh              install / refresh
#   scripts/install.sh --uninstall  remove everything this script created
set -euo pipefail

ZD="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLAUDE_DIR="${CLAUDE_CONFIG_DIR:-$HOME/.claude}"
SKILL_TARGETS=("$CLAUDE_DIR/skills" "$HOME/.agents/skills")
AGENT_TARGET="$CLAUDE_DIR/agents"
GLOBAL_MD="$CLAUDE_DIR/CLAUDE.md"
START="<!-- zero-dawn:start (managed by $ZD/scripts/install.sh) -->"
END="<!-- zero-dawn:end -->"
MODE="${1:-install}"

link() { # link <src> <dest>
  local src="$1" dest="$2"
  if [ -L "$dest" ]; then
    [ "$(readlink "$dest")" = "$src" ] && return 0
    case "$(readlink "$dest")" in "$ZD"/*) ln -sfn "$src" "$dest"; echo "  relinked $dest"; return 0;; esac
    echo "  SKIP $dest (symlink to somewhere else)"; return 0
  fi
  if [ -e "$dest" ]; then echo "  SKIP $dest (exists and is not ours)"; return 0; fi
  ln -s "$src" "$dest"; echo "  linked $dest"
}

unlink_ours() { # remove symlinks in <dir> pointing into this repo
  local dir="$1"; [ -d "$dir" ] || return 0
  for l in "$dir"/*; do
    [ -L "$l" ] || continue
    case "$(readlink "$l")" in "$ZD"/*) rm "$l"; echo "  removed $l";; esac
  done
}

strip_block() { # remove the managed block from the global CLAUDE.md
  [ -f "$GLOBAL_MD" ] || return 0
  awk -v s="<!-- zero-dawn:start" -v e="$END" '
    index($0, s) == 1 {skip=1; next}
    skip && $0 == e {skip=0; next}
    !skip {print}' "$GLOBAL_MD" > "$GLOBAL_MD.zd.tmp" && mv "$GLOBAL_MD.zd.tmp" "$GLOBAL_MD"
}

if [ "$MODE" = "--uninstall" ]; then
  echo "Uninstalling Zero Dawn links"
  for t in "${SKILL_TARGETS[@]}"; do unlink_ours "$t"; done
  unlink_ours "$AGENT_TARGET"
  strip_block; echo "  removed rules import from $GLOBAL_MD"
  exit 0
fi

echo "Installing Zero Dawn from $ZD"
for t in "${SKILL_TARGETS[@]}"; do
  mkdir -p "$t"; echo "skills → $t"
  for s in "$ZD"/skills/*/; do s="${s%/}"; link "$s" "$t/$(basename "$s")"; done
done
mkdir -p "$AGENT_TARGET"; echo "agents → $AGENT_TARGET"
for a in "$ZD"/agents/*.md; do link "$a" "$AGENT_TARGET/$(basename "$a")"; done

touch "$GLOBAL_MD"; strip_block
{
  [ -s "$GLOBAL_MD" ] && echo
  echo "$START"
  echo "Zero Dawn home: $ZD (portfolio registry: $ZD/docs/portfolio/registry.md)"
  echo "@$ZD/global/RULES.md"
  echo "$END"
} >> "$GLOBAL_MD"
echo "rules → imported from $GLOBAL_MD"
echo "Done. Restart your agent sessions to pick up new skills."
