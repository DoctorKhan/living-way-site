#!/usr/bin/env bash
# Run everything important for the Living Way site: optional knowledge build, sync, optional local serve.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
KNOWLEDGE="${ROOT}/../living-way-knowledge"
DO_BUILD=false
DO_SERVE=false

show_help() {
  echo "Living Way site — run script"
  echo ""
  echo "Usage: $0 [build] [serve]"
  echo ""
  echo "Options:"
  echo "  (none)    Sync public-knowledge from ../living-way-knowledge only."
  echo "  build     Build knowledge repo (PDF + HTML) first, then sync."
  echo "  serve     After sync, start local server at http://localhost:8000"
  echo "  help      Show this help (also -h, --help)."
  echo ""
  echo "Examples:"
  echo "  $0              # sync only"
  echo "  $0 serve        # sync + preview in browser"
  echo "  $0 build        # build knowledge, then sync"
  echo "  $0 build serve  # build, sync, then serve locally"
  echo ""
}

for arg in "$@"; do
  case "$arg" in
    build)      DO_BUILD=true ;;
    serve)      DO_SERVE=true ;;
    help|--help|-h)
      show_help
      exit 0
      ;;
  esac
done

# 1. Optionally build the knowledge repo (PDFs + HTML)
if "$DO_BUILD"; then
  if [[ -x "$KNOWLEDGE/run.sh" ]]; then
    echo "==> Building knowledge (PDF + HTML)..."
    (cd "$KNOWLEDGE" && ./run.sh)
  else
    echo "==> Skipping build: $KNOWLEDGE/run.sh not found or not executable."
  fi
fi

# 2. Sync public-knowledge from living-way-knowledge (always)
echo "==> Syncing public-knowledge from ../living-way-knowledge..."
"$ROOT/scripts/sync-public-knowledge.sh"

# 3. Optionally serve the site locally
if "$DO_SERVE"; then
  echo "==> Starting local server at http://localhost:8000 (Ctrl+C to stop)"
  if command -v python3 &>/dev/null; then
    (cd "$ROOT" && python3 -m http.server 8000)
  elif command -v python &>/dev/null; then
    (cd "$ROOT" && python -m http.server 8000)
  else
    echo "No python found. Install Python or run: npx serve . -p 8000"
    exit 1
  fi
fi
