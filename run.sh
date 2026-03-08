#!/usr/bin/env bash
# Run everything important for the Living Way site: optional knowledge build, sync, optional local serve.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
KNOWLEDGE="${ROOT}/../living-way-knowledge"
DO_BUILD=false
DO_SERVE=false
PORT="${PORT:-8000}"

show_help() {
  echo "Living Way site — run script"
  echo ""
  echo "Usage: $0 [dev] [build] [serve]"
  echo ""
  echo "Options:"
  echo "  (none)    Sync public-knowledge from ../living-way-knowledge only."
  echo "  dev       Alias for serve. Sync, then start local server."
  echo "  build     Build knowledge repo (PDF + HTML) first, then sync."
  echo "  serve     After sync, start local server at http://localhost:${PORT}"
  echo "  test      Run tests (API + Groq client contract)."
  echo "  help      Show this help (also -h, --help)."
  echo ""
  echo "Examples:"
  echo "  $0              # sync only"
  echo "  $0 dev          # sync + serve locally"
  echo "  $0 serve        # sync + preview in browser"
  echo "  $0 build        # build knowledge, then sync"
  echo "  $0 build serve  # build, sync, then serve locally"
  echo "  $0 test         # run test suite"
  echo ""
}

for arg in "$@"; do
  case "$arg" in
    dev)        DO_SERVE=true ;;
    build)      DO_BUILD=true ;;
    serve)      DO_SERVE=true ;;
    test)
      echo "==> Running tests..."
      (cd "$ROOT" && pnpm run test 2>/dev/null || npm run test 2>/dev/null || node --test tests/api/groq-chat.test.mjs tests/groq-ai-client.test.mjs)
      exit $?
      ;;
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
  echo "==> Local preview"
  echo "    Home:    http://localhost:${PORT}"
  echo "    Library: http://localhost:${PORT}/public-knowledge/"
  echo "    Reader:  http://localhost:${PORT}/public-knowledge/read.html?doc=Laozi/The_Unforced_Leader_Tao_Te_Ching.md"
  echo ""
  echo "==> Starting local server (Ctrl+C to stop)"
  if command -v python3 &>/dev/null; then
    (cd "$ROOT" && python3 -m http.server "$PORT")
  elif command -v python &>/dev/null; then
    (cd "$ROOT" && python -m http.server "$PORT")
  else
    echo "No python found. Install Python or run: npx serve . -p ${PORT}"
    exit 1
  fi
fi
