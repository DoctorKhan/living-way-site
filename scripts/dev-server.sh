#!/usr/bin/env bash
# Static preview: Python http.server. PORT and HOST are set by runctl / run-lib.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PORT="${PORT:-8000}"
HOST="${HOST:-127.0.0.1}"
cd "$ROOT"
exec python3 -m http.server "$PORT" --bind "$HOST"
