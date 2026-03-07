#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/../living-way-knowledge/"
DEST="$ROOT/public-knowledge/"

# Site keeps its own Library index (organized by teacher); do not overwrite or delete it.
# read.html lives in the knowledge repo so it syncs over (markdown reader for .md links).
# rsync --delete would remove dest index.html (we exclude it from source), so save/restore it.
SAVED_INDEX=""
if [[ -f "$DEST/index.html" ]]; then
  SAVED_INDEX="$(mktemp)"
  cp "$DEST/index.html" "$SAVED_INDEX"
fi

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

if [[ -n "$SAVED_INDEX" && -f "$SAVED_INDEX" ]]; then
  cp "$SAVED_INDEX" "$DEST/index.html"
  rm -f "$SAVED_INDEX"
fi

echo "Synced public knowledge from $SRC to $DEST"
