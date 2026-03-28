#!/usr/bin/env bash
# Default: compile PDFs + HTML only when inputs changed, then sync to sibling consumers.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC_SCRIPT="$ROOT/tools/sync-public-knowledge.sh"
TEMPLATE="$ROOT/templates/guide_template.html"
BUILD_HTML_SH="$ROOT/tools/build_html.sh"

cmd=${1:-}
sub=${2:-}

show_help() {
  echo "Usage: ./run.sh [command] [force]"
  echo ""
  echo "  (default)            Incremental: PDF/HTML only if sources are newer than outputs, then sync."
  echo "  rebuild | force      Full PDF + HTML build, then sync."
  echo "  build-only           Incremental build only; no sync."
  echo "  build-only force     Full build only; no sync."
  echo "  sync                 Sync only (no LaTeX/HTML)."
  echo "  help                 Show this help."
  echo ""
  echo "Markdown or other files under this repo are still synced on the default path even when"
  echo "LaTeX/HTML are skipped; use ./run.sh sync for a fast mirror refresh without any build."
  echo "Guide HTML is built from Core/living-way-guide.md (see tools/build_html.sh)."
}

# True if we should run pdflatex for this root-level .tex file.
needs_latex_pdf() {
  local tex="$1"
  local pdf="${tex%.tex}.pdf"
  [[ ! -f "$pdf" ]] && return 0
  [[ "$tex" -nt "$pdf" ]] && return 0
  return 1
}

# True if HTML build (pandoc) should run — any stale product or missing output.
needs_html_build() {
  local f base html
  for f in "$ROOT"/*.tex; do
    [[ -e "$f" ]] || continue
    base=$(basename "$f" .tex)
    [[ "$base" == debug_* ]] && continue
    html="$ROOT/${base}.html"
    [[ ! -f "$html" ]] && return 0
    [[ "$f" -nt "$html" ]] && return 0
    [[ -f "$TEMPLATE" && "$TEMPLATE" -nt "$html" ]] && return 0
    [[ -f "$BUILD_HTML_SH" && "$BUILD_HTML_SH" -nt "$html" ]] && return 0
  done
  local guide_md="$ROOT/Core/living-way-guide.md"
  if [[ -f "$guide_md" ]]; then
    [[ ! -f "$ROOT/living_way_guide.html" ]] && return 0
    [[ "$guide_md" -nt "$ROOT/living_way_guide.html" ]] && return 0
    [[ -f "$TEMPLATE" && "$TEMPLATE" -nt "$ROOT/living_way_guide.html" ]] && return 0
    [[ -f "$BUILD_HTML_SH" && "$BUILD_HTML_SH" -nt "$ROOT/living_way_guide.html" ]] && return 0
  fi
  return 1
}

do_build() {
  local force="${1:-false}"
  local did_any=false

  if [[ "$force" == true ]]; then
    echo "==> Full build (forced)..."
    for tex in The_Living_Way.tex The_Living_Suttas.tex The_Living_Architecture.tex; do
      echo "Compiling $tex..."
      (cd "$ROOT" && pdflatex -interaction=nonstopmode "$tex" >/dev/null) || echo "Warning: PDF build for $tex had errors."
      did_any=true
    done
    (cd "$ROOT" && ./tools/build_html.sh)
    echo "==> Build complete."
    return
  fi

  echo "==> Incremental build (use ./run.sh rebuild to force everything)..."

  for tex in The_Living_Way.tex The_Living_Suttas.tex The_Living_Architecture.tex; do
    if needs_latex_pdf "$ROOT/$tex"; then
      echo "Compiling $tex..."
      (cd "$ROOT" && pdflatex -interaction=nonstopmode "$tex" >/dev/null) || echo "Warning: PDF build for $tex had errors."
      did_any=true
    else
      echo "Skipping $tex (PDF up to date)."
    fi
  done

  if needs_html_build; then
    (cd "$ROOT" && ./tools/build_html.sh)
    did_any=true
  else
    echo "Skipping HTML build (outputs up to date)."
  fi

  if [[ "$did_any" == false ]]; then
    echo "==> No LaTeX/HTML rebuild needed (sources unchanged)."
  else
    echo "==> Build complete."
  fi
}

sync_consumers() {
  if [[ ! -f "$SYNC_SCRIPT" ]]; then
    echo "ERROR: missing $SYNC_SCRIPT" >&2
    return 1
  fi
  if [[ ! -x "$SYNC_SCRIPT" ]]; then
    chmod +x "$SYNC_SCRIPT" || true
  fi

  local synced=false
  if [[ -d "$ROOT/../living-way-site" ]]; then
    echo "==> Syncing to living-way-site/public-knowledge/ ..."
    "$SYNC_SCRIPT" "$ROOT/../living-way-site/public-knowledge/"
    synced=true
  fi
  if [[ -d "$ROOT/../living-way-app" ]]; then
    echo "==> Syncing to living-way-app/public-knowledge/ ..."
    "$SYNC_SCRIPT" "$ROOT/../living-way-app/public-knowledge/"
    synced=true
  fi
  if [[ "$synced" == false ]]; then
    echo "==> No sibling repos at ../living-way-site or ../living-way-app — skipped sync."
    echo "    (Clone them next to this repo, or run: ./tools/sync-public-knowledge.sh <dest>)"
  fi
}

case "$cmd" in
  help|-h|--help)
    show_help
    ;;
  build-only)
    if [[ "$sub" == "force" ]]; then
      do_build true
    else
      do_build false
    fi
    ;;
  rebuild|force)
    do_build true
    sync_consumers
    ;;
  sync)
    sync_consumers
    ;;
  ""|incremental)
    do_build false
    sync_consumers
    ;;
  *)
    echo "Unknown command: $cmd" >&2
    show_help >&2
    exit 1
    ;;
esac
