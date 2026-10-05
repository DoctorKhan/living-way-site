#!/usr/bin/env bash
# Sync the living-way-knowledge repo tree into a consumer's public-knowledge/ (or similar) directory.
# Single source of rsync flags and excludes for local dev, site scripts, CI, and app copies.
#
# Usage:
#   ./tools/sync-public-knowledge.sh /path/to/public-knowledge/
#
# Examples:
#   From living-way-site:  ../living-way-knowledge/tools/sync-public-knowledge.sh ./public-knowledge/
#   From GitHub Actions:   bash knowledge-repo/tools/sync-public-knowledge.sh public-knowledge/
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
KNOWLEDGE_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
EXCLUDE_FILE="$SCRIPT_DIR/public-knowledge-rsync.excludes"

if [[ ! -f "$EXCLUDE_FILE" ]]; then
  echo "ERROR: missing $EXCLUDE_FILE" >&2
  exit 1
fi

if [[ $# -ne 1 ]]; then
  echo "Usage: ${0##*/} <destination-directory/>" >&2
  exit 1
fi

DEST="$1"
mkdir -p "$DEST"

# Refuse to sync into the knowledge repo itself (e.g. a consumer's
# public-knowledge that is a symlink back here) — --delete-excluded
# would strip repo internals from the canonical source.
DEST_REAL="$(cd "$DEST" && pwd -P)"
if [[ "$DEST_REAL" == "$KNOWLEDGE_ROOT" || "$DEST_REAL" == "$KNOWLEDGE_ROOT"/* ]]; then
  echo "SKIP: $DEST resolves inside the knowledge repo ($DEST_REAL); nothing to sync." >&2
  exit 0
fi

rsync -av --delete --delete-excluded \
  --exclude-from="$EXCLUDE_FILE" \
  "$KNOWLEDGE_ROOT/" \
  "$DEST"

echo "Synced $KNOWLEDGE_ROOT/ -> $DEST"
