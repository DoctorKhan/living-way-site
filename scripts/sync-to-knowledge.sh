#!/usr/bin/env bash
# Push site-owned (or co-maintained) public-knowledge files back to living-way-knowledge
# so the knowledge repo stays the long-term source of truth for those paths.
# Run after editing public-knowledge/ in this repo: ./scripts/sync-to-knowledge.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$ROOT/../living-way-knowledge/"

if [[ ! -d "$DEST" ]]; then
  echo "ERROR: Knowledge repo not found at $DEST"
  exit 1
fi

# Files we maintain in living-way-site/public-knowledge that should also live in knowledge
FILES=(
  "index.html"
  "read.html"
)

for f in "${FILES[@]}"; do
  src="$ROOT/public-knowledge/$f"
  if [[ ! -f "$src" ]]; then
    echo "SKIP (missing): $src"
    continue
  fi
  cp "$src" "$DEST$f"
  echo "Copied public-knowledge/$f -> ../living-way-knowledge/$f"
done

echo "Done. Commit in living-way-knowledge if content changed."
