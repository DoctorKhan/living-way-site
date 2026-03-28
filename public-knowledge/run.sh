#!/usr/bin/env bash
# Default: compile PDFs + HTML only when inputs changed, then sync to sibling consumers.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SYNC_SCRIPT="$ROOT/tools/sync-public-knowledge.sh"
TEMPLATE="$ROOT/templates/guide_template.html"
BUILD_HTML_SH="$ROOT/tools/build_html.sh"
PUBLICATIONS_FILE="$ROOT/tools/publications.tsv"
PUBLISH_LIBRARY_JS="$ROOT/tools/publish_library_assets.js"
BOOK_TEX_TEMPLATE="$ROOT/templates/book_print_template.tex"
BOOK_TEX_FILTER="$ROOT/tools/markdown_to_book_latex.lua"
PRINT_METADATA_DIR="$ROOT/templates/print-metadata"

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
  echo "Published works are declared in tools/publications.tsv."
  echo "Flagship book .tex files are generated from Markdown before PDF compilation."
  echo "Sync/build also publishes library_manifest.json and stable works/<id>.html|pdf aliases."
}

require_publication_contract() {
  if [[ ! -f "$PUBLICATIONS_FILE" ]]; then
    echo "ERROR: missing $PUBLICATIONS_FILE" >&2
    return 1
  fi

  if [[ ! -f "$PUBLISH_LIBRARY_JS" ]]; then
    echo "ERROR: missing $PUBLISH_LIBRARY_JS" >&2
    return 1
  fi

  if [[ ! -f "$BOOK_TEX_TEMPLATE" ]]; then
    echo "ERROR: missing $BOOK_TEX_TEMPLATE" >&2
    return 1
  fi

  if [[ ! -f "$BOOK_TEX_FILTER" ]]; then
    echo "ERROR: missing $BOOK_TEX_FILTER" >&2
    return 1
  fi

  if [[ ! -d "$PRINT_METADATA_DIR" ]]; then
    echo "ERROR: missing $PRINT_METADATA_DIR" >&2
    return 1
  fi
}

# True when a CSV-like formats field contains the named format.
has_format() {
  local formats="${1:-}"
  local expected="${2:-}"
  [[ ",$formats," == *",$expected,"* ]]
}

# True if we should regenerate a published TeX file from Markdown.
needs_tex_build() {
  local kind="$1"
  local source="$2"
  local public_base="$3"
  local tex="$ROOT/${public_base}.tex"
  local metadata_file="$PRINT_METADATA_DIR/${public_base}.yaml"

  [[ "$kind" != "md" ]] && return 1
  [[ ! -f "$tex" ]] && return 0
  [[ "$ROOT/$source" -nt "$tex" ]] && return 0
  [[ -f "$BOOK_TEX_TEMPLATE" && "$BOOK_TEX_TEMPLATE" -nt "$tex" ]] && return 0
  [[ -f "$BOOK_TEX_FILTER" && "$BOOK_TEX_FILTER" -nt "$tex" ]] && return 0
  [[ -f "$metadata_file" && "$metadata_file" -nt "$tex" ]] && return 0
  [[ -f "$PUBLICATIONS_FILE" && "$PUBLICATIONS_FILE" -nt "$tex" ]] && return 0
  return 1
}

# True if we should rebuild a published PDF.
needs_pdf_build() {
  local kind="$1"
  local source="$2"
  local public_base="$3"
  local pdf="$ROOT/${public_base}.pdf"
  [[ ! -f "$pdf" ]] && return 0
  if [[ "$kind" == "md" ]]; then
    [[ -f "$ROOT/${public_base}.tex" && "$ROOT/${public_base}.tex" -nt "$pdf" ]] && return 0
  else
    [[ "$ROOT/$source" -nt "$pdf" ]] && return 0
  fi
  [[ -f "$PUBLICATIONS_FILE" && "$PUBLICATIONS_FILE" -nt "$pdf" ]] && return 0
  return 1
}

# True if HTML build (pandoc) should run — any stale product or missing output.
needs_html_build() {
  local id kind source public_base title section voice formats html
  while IFS=$'\t' read -r id kind source public_base title section voice formats; do
    [[ "$id" == "id" || -z "$id" ]] && continue
    has_format "$formats" "html" || continue
    [[ "$kind" == "static-html" ]] && continue
    html="$ROOT/${public_base}.html"
    [[ ! -f "$html" ]] && return 0
    [[ "$ROOT/$source" -nt "$html" ]] && return 0
    [[ -f "$TEMPLATE" && "$TEMPLATE" -nt "$html" ]] && return 0
    [[ -f "$BUILD_HTML_SH" && "$BUILD_HTML_SH" -nt "$html" ]] && return 0
    [[ -f "$PUBLICATIONS_FILE" && "$PUBLICATIONS_FILE" -nt "$html" ]] && return 0
  done < "$PUBLICATIONS_FILE"
  return 1
}

publish_library_assets() {
  require_publication_contract

  (cd "$ROOT" && node "$PUBLISH_LIBRARY_JS")
}

build_tex_from_markdown() {
  local source="$1"
  local public_base="$2"
  local title="$3"
  local metadata_file="$PRINT_METADATA_DIR/${public_base}.yaml"
  local -a metadata_args=()

  if [[ -f "$metadata_file" ]]; then
    metadata_args+=(--metadata-file="$metadata_file")
  fi

  echo "Generating ${public_base}.tex from $source..."
  (
    cd "$ROOT" && \
    pandoc "$source" \
      -f markdown+bracketed_spans+fenced_divs \
      --standalone \
      --to=latex \
      --top-level-division=chapter \
      --template="$BOOK_TEX_TEMPLATE" \
      --lua-filter="$BOOK_TEX_FILTER" \
      "${metadata_args[@]}" \
      --metadata title="$title" \
      -o "${public_base}.tex"
  )
}

compile_pdf_from_tex() {
  local tex_source="$1"
  local public_base="$2"

  echo "Compiling ${tex_source} -> ${public_base}.pdf..."
  (
    cd "$ROOT" && \
    pdflatex -jobname "$public_base" -interaction=nonstopmode "$tex_source" >/dev/null && \
    pdflatex -jobname "$public_base" -interaction=nonstopmode "$tex_source" >/dev/null
  )
}

do_build() {
  local force="${1:-false}"
  local did_any=false

  require_publication_contract

  if [[ "$force" == true ]]; then
    echo "==> Full build (forced)..."
    local id kind source public_base title section voice formats
    while IFS=$'\t' read -r id kind source public_base title section voice formats; do
      [[ "$id" == "id" || -z "$id" ]] && continue
      if [[ "$kind" == "md" ]] && { has_format "$formats" "tex" || has_format "$formats" "pdf"; }; then
        build_tex_from_markdown "$source" "$public_base" "$title" || echo "Warning: TeX generation for $source had errors."
        did_any=true
      fi
      if has_format "$formats" "pdf"; then
        if [[ "$kind" == "md" ]]; then
          compile_pdf_from_tex "${public_base}.tex" "$public_base" || echo "Warning: PDF build for ${public_base}.tex had errors."
        elif [[ "$kind" == "tex" ]]; then
          compile_pdf_from_tex "$source" "$public_base" || echo "Warning: PDF build for $source had errors."
        fi
        did_any=true
      fi
    done < "$PUBLICATIONS_FILE"
    (cd "$ROOT" && ./tools/build_html.sh)
    publish_library_assets
    echo "==> Build complete."
    return
  fi

  echo "==> Incremental build (use ./run.sh rebuild to force everything)..."

  local id kind source public_base title section voice formats
  while IFS=$'\t' read -r id kind source public_base title section voice formats; do
    [[ "$id" == "id" || -z "$id" ]] && continue
    if [[ "$kind" == "md" ]] && { has_format "$formats" "tex" || has_format "$formats" "pdf"; }; then
      if needs_tex_build "$kind" "$source" "$public_base"; then
        build_tex_from_markdown "$source" "$public_base" "$title" || echo "Warning: TeX generation for $source had errors."
        did_any=true
      else
        echo "Skipping ${public_base}.tex (TeX up to date)."
      fi
    fi
    has_format "$formats" "pdf" || continue
    if needs_pdf_build "$kind" "$source" "$public_base"; then
      if [[ "$kind" == "md" ]]; then
        compile_pdf_from_tex "${public_base}.tex" "$public_base" || echo "Warning: PDF build for ${public_base}.tex had errors."
      elif [[ "$kind" == "tex" ]]; then
        compile_pdf_from_tex "$source" "$public_base" || echo "Warning: PDF build for $source had errors."
      fi
      did_any=true
    else
      echo "Skipping ${public_base}.pdf (PDF up to date)."
    fi
  done < "$PUBLICATIONS_FILE"

  if needs_html_build; then
    (cd "$ROOT" && ./tools/build_html.sh)
    did_any=true
  else
    echo "Skipping HTML build (outputs up to date)."
  fi

  publish_library_assets

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

  publish_library_assets

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
