#!/usr/bin/env bash
# Run everything important for the Living Way site: optional knowledge build, sync, optional local serve.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
KNOWLEDGE="${ROOT}/../living-way-knowledge"
DO_BUILD=false
DO_SERVE=false
PORT="${PORT:-8000}"
RUNCTL_BIN="$ROOT/node_modules/.bin/runctl"

have_runctl() {
  [[ -x "$RUNCTL_BIN" ]] && return 0
  (cd "$ROOT" && pnpm exec runctl version >/dev/null 2>&1) && return 0
  command -v runctl >/dev/null 2>&1
}

open_site_url() {
  local url="$1"
  if command -v open >/dev/null 2>&1; then
    open "$url"
  elif command -v xdg-open >/dev/null 2>&1; then
    xdg-open "$url"
  elif command -v wslview >/dev/null 2>&1; then
    wslview "$url"
  else
    echo "Open in browser: $url"
  fi
}

wait_for_local_http() {
  local host="$1"
  local port="$2"
  local attempts="${3:-20}"
  local i=0
  command -v curl >/dev/null 2>&1 || return 0
  while (( i < attempts )); do
    if curl -fsS "http://${host}:${port}/" >/dev/null 2>&1; then
      return 0
    fi
    sleep 0.25
    i=$((i + 1))
  done
  return 1
}

runctl_cmd() {
  if [[ -x "$RUNCTL_BIN" ]]; then
    (cd "$ROOT" && "$RUNCTL_BIN" "$@")
  elif (cd "$ROOT" && pnpm exec runctl version >/dev/null 2>&1); then
    (cd "$ROOT" && pnpm exec runctl "$@")
  elif command -v runctl >/dev/null 2>&1; then
    (cd "$ROOT" && runctl "$@")
  else
    return 127
  fi
}

show_help() {
  echo "Living Way site — run script"
  echo ""
  echo "Usage: $0 [dev|serve|open|build|stop|status|gc|ports|test|push-knowledge|help]"
  echo ""
  echo "Options:"
  echo "  (none)    Sync public-knowledge from ../living-way-knowledge only."
  echo "  dev       Alias for serve. Sync, then start local server via runctl when available."
  echo "  build     Build knowledge repo (PDF + HTML) first, then sync."
  echo "  serve     After sync, start local server."
  echo "  open      Start the local preview if needed, then open it."
  echo "  stop      Stop the local preview."
  echo "  status    Show local preview status."
  echo "  gc        Clean stale runctl port claims."
  echo "  ports     List runctl port claims."
  echo "  test      Run tests (API + Groq client contract)."
  echo "  push-knowledge  Copy co-maintained Library files from public-knowledge/ → ../living-way-knowledge/"
  echo "  help      Show this help (also -h, --help)."
  echo ""
  echo "Examples:"
  echo "  $0              # sync only"
  echo "  $0 dev          # sync + serve locally"
  echo "  $0 serve        # sync + preview in browser"
  echo "  $0 open         # start if needed, then open preview"
  echo "  $0 stop         # stop local preview"
  echo "  $0 status       # show local preview status"
  echo "  $0 gc           # clean stale runctl port claims"
  echo "  $0 build        # build knowledge, then sync"
  echo "  $0 build serve  # build, sync, then serve locally"
  echo "  $0 test         # run test suite"
  echo "  $0 push-knowledge  # after editing public-knowledge/index.html or read.html here"
  echo ""
}

for arg in "$@"; do
  case "$arg" in
    dev)        DO_SERVE=true ;;
    build)      DO_BUILD=true ;;
    serve)      DO_SERVE=true ;;
    open)       DO_SERVE=true ;;
    stop)
      echo "==> Stopping local preview..."
      runctl_cmd stop "$ROOT"
      exit $?
      ;;
    status)
      runctl_cmd status "$ROOT"
      exit $?
      ;;
    gc)
      echo "==> Cleaning stale runctl port claims..."
      runctl_cmd gc
      exit $?
      ;;
    ports)
      runctl_cmd ports
      exit $?
      ;;
    test)
      echo "==> Running tests..."
      (cd "$ROOT" && pnpm run test 2>/dev/null || npm run test 2>/dev/null || node --test tests/api/groq-chat.test.mjs tests/groq-ai-client.test.mjs)
      exit $?
      ;;
    push*)
      echo "==> Pushing co-maintained Library files to living-way-knowledge..."
      "$ROOT/scripts/sync-to-knowledge.sh"
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
  RUN_LIB="$ROOT/node_modules/@zendero/runctl/lib/run-lib.sh"
  if [[ -f "$RUN_LIB" ]]; then
    # Global `runctl start` runs with nounset; macOS bash 3.2 chokes on empty dev_extra[@].
    # Source run-lib here with set +u, then use run_start_package_dev (same as the CLI).
    echo "==> Local preview (runctl — server runs in background)"
    echo "    Stop: run stop   or   pnpm exec runctl stop"
    echo "    Status: run status   or   pnpm exec runctl status"
    echo "    Logs: $ROOT/.run/logs/"
    set +u
    # shellcheck source=/dev/null
    source "$RUN_LIB"
    run_project_init "$ROOT"
    export RUNCTL_PM_RUN_SCRIPT=dev:server
    export RUNCTL_SKIP_PREDEV=1
    run_with_lock run_start_package_dev web "${PORT:-8000}" || { set -u; exit 1; }
    set -u
    if [[ -f "$ROOT/.run/ports.env" ]]; then
      # shellcheck source=/dev/null
      set -a && source "$ROOT/.run/ports.env" && set +a
    fi
    echo "    Home:    http://localhost:${PORT:-8000}/"
    echo "    Library: http://localhost:${PORT:-8000}/public-knowledge/"
    echo "    Reader:  http://localhost:${PORT:-8000}/public-knowledge/read.html?doc=Laozi/The_Unforced_Leader_Tao_Te_Ching.md"
    if ! wait_for_local_http "127.0.0.1" "${PORT:-8000}" 20; then
      echo "==> Preview failed to respond on http://127.0.0.1:${PORT:-8000}/" >&2
      echo "    Check logs: $ROOT/.run/logs/web.log" >&2
      exit 1
    fi
    echo "==> Opening site in browser..."
    runctl_cmd open "$ROOT" || open_site_url "http://127.0.0.1:${PORT:-8000}/"
  elif have_runctl; then
    echo "==> Local preview (runctl CLI — install project runctl for macOS: pnpm install)"
    echo "    Stop: run stop   or   pnpm exec runctl stop"
    echo "    Status: run status   or   pnpm exec runctl status"
    echo "    Logs: $ROOT/.run/logs/"
    runctl_cmd start "$ROOT" --script dev:server || {
      echo "==> runctl start failed (try: pnpm install). Falling back to Python server." >&2
      DO_SERVE_VIA_PYTHON=1
    }
    if [[ "${DO_SERVE_VIA_PYTHON:-}" != 1 ]]; then
      if [[ -f "$ROOT/.run/ports.env" ]]; then
        # shellcheck source=/dev/null
        set -a && source "$ROOT/.run/ports.env" && set +a
      fi
      echo "    Home:    http://localhost:${PORT:-8000}/"
      echo "    Library: http://localhost:${PORT:-8000}/public-knowledge/"
      echo "    Reader:  http://localhost:${PORT:-8000}/public-knowledge/read.html?doc=Laozi/The_Unforced_Leader_Tao_Te_Ching.md"
      if ! wait_for_local_http "127.0.0.1" "${PORT:-8000}" 20; then
        echo "==> Preview failed to respond on http://127.0.0.1:${PORT:-8000}/" >&2
        echo "    Check logs: $ROOT/.run/logs/web.log" >&2
        exit 1
      fi
      echo "==> Opening site in browser..."
      runctl_cmd open "$ROOT" || open_site_url "http://127.0.0.1:${PORT:-8000}/"
    fi
  fi
  if [[ "${DO_SERVE_VIA_PYTHON:-}" == 1 ]]; then
    echo "==> Local preview (Python)"
    echo "    Home:    http://localhost:${PORT}"
    echo "    Library: http://localhost:${PORT}/public-knowledge/"
    (sleep 0.5; open_site_url "http://127.0.0.1:${PORT}/") &
    if command -v python3 &>/dev/null; then
      (cd "$ROOT" && python3 -m http.server "$PORT" --bind 127.0.0.1)
    else
      echo "No python3 found." >&2
      exit 1
    fi
    exit 0
  elif ! [[ -f "$RUN_LIB" ]] && ! have_runctl; then
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
fi
