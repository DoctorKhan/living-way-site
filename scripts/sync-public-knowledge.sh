#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/../living-way-knowledge/"
DEST="$ROOT/public-knowledge/"

# Site keeps its own Library index (organized by teacher); do not overwrite with knowledge repo's index.
rsync -av --delete \
  --exclude '.git/' \
  --exclude '.vscode/' \
  --exclude 'index.html' \
  --exclude '*.aux' \
  --exclude '*.log' \
  --exclude '*.toc' \
  --exclude '*.fls' \
  --exclude '*.fdb_latexmk' \
  --exclude '*.out' \
  "$SRC" "$DEST"

echo "Synced public knowledge from $SRC to $DEST"
