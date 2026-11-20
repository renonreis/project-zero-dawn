#!/usr/bin/env bash
# Show what changed upstream (jsmastery-pro/skills) since our pinned import,
# so improvements can be ported by hand on top of Zero Dawn's adaptations.
#   scripts/upstream-diff.sh            summary of changed files upstream
#   scripts/upstream-diff.sh <path>     full upstream diff for one path (e.g. skills/scope/SKILL.md)
set -euo pipefail
PINNED="43b69e44c9ca905fe3a3418ccdf4102255e20d40"
REPO="https://github.com/jsmastery-pro/skills.git"
WORK="${TMPDIR:-/tmp}/zero-dawn-upstream"

if [ -d "$WORK/.git" ]; then git -C "$WORK" fetch -q origin; else git clone -q "$REPO" "$WORK"; fi
HEAD_SHA="$(git -C "$WORK" rev-parse origin/HEAD)"
echo "pinned:   $PINNED"
echo "upstream: $HEAD_SHA"
[ "$PINNED" = "$HEAD_SHA" ] && { echo "Up to date."; exit 0; }
if [ $# -eq 0 ]; then
  git -C "$WORK" log --oneline "$PINNED..$HEAD_SHA"
  echo; git -C "$WORK" diff --stat "$PINNED" "$HEAD_SHA" -- skills .claude/agents scripts docs
else
  git -C "$WORK" diff "$PINNED" "$HEAD_SHA" -- "$1"
fi
echo
echo "After porting, update PINNED here and the commit in NOTICE.md."
