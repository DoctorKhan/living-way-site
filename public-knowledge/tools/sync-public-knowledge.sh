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

rsync -av --delete \
  --exclude-from="$EXCLUDE_FILE" \
  "$KNOWLEDGE_ROOT/" \
  "$DEST"

echo "Synced $KNOWLEDGE_ROOT/ -> $DEST"
