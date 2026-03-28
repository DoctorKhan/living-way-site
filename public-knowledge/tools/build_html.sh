#!/bin/bash
set -euo pipefail

# Configuration
TEMPLATE="templates/guide_template.html"
PUBLICATIONS_FILE="tools/publications.tsv"
ORNAMENT_MARKER="ORNAMENT-MARKER-XYZ"
# We use a pipe | as delimiter in perl, so no need to escape / in </div>
ORNAMENT_HTML='<div class="ornament">✦ ✦ ✦</div>'

echo "--- Starting HTML Build ---"

# Function to process TeX files
process_tex() {
    local tex_file="$1"
    local html_file="$2"
    local title="$3"
    local base_name=$(basename "$html_file" .html)
    local temp_tex="${base_name}.temp.tex"

    echo "Converting $tex_file..."
    
	    # 1. Pre-process LaTeX for Pandoc
	    #    a. Replace bare \ornament lines with a unique marker that we can
	    #       turn into a decorative divider in HTML.
	    #    b. Treat verse "stanza breaks" (blank line after a line ending in \\)
	    #       as real paragraph breaks by removing the trailing \\ in that
	    #       position. This lets Pandoc emit separate <p> blocks, so stanza
	    #       gaps appear in HTML the same way they do in the PDF.
	    perl -0pe 's/^\s*\\ornament\s*$/'"$ORNAMENT_MARKER"'/mg' "$tex_file" | \
	    perl -0pe 's/\\+\s*\n\s*\n/\n\n/g' > "$temp_tex"
    
    # 2. Run Pandoc
    pandoc "$temp_tex" \
        -o "$html_file" \
        --template="$TEMPLATE" \
        --to=html \
        --metadata title="$title" \
        --standalone

    # 3. Post-process: Replace the marker with the actual HTML ornament
    # Using perl for robust in-place replacement with different delimiter
    perl -i -pe "s|$ORNAMENT_MARKER|$ORNAMENT_HTML|g" "$html_file"
    
    # Cleanup invalid HTML (div inside p) produced by pandoc wrapping the marker
    perl -i -pe 's|<p>\s*(<div class="ornament">.*?</div>)\s*</p>|$1|g' "$html_file"
    
    # Cleanup
    rm "$temp_tex"
    echo "✓ Generated $html_file"
}

process_md() {
    local md_file="$1"
    local html_file="$2"
    local title="$3"
    local temp_md

    temp_md="$(mktemp "${TMPDIR:-/tmp}/living-way-md.XXXXXX.md")"
    cp "$md_file" "$temp_md"

    # Normalize handcrafted ornament blocks and strip print-only markers before Pandoc.
    perl -0pi -e 's/:::\s*\{?\.center\}?\s*\n(?:\s*\n)?\s*\$\\cdot\$\s+\$\\odot\$\s+\$\\cdot\$\s*\n(?:\s*\n)?:::/'"$ORNAMENT_MARKER"'/gms' "$temp_md"
    perl -0pi -e 's/^\s*\\(?:frontmatter|mainmatter|backmatter)\s*$\n?//mg' "$temp_md"

    echo "Converting $md_file..."
    pandoc "$temp_md" \
        -f markdown+bracketed_spans+fenced_divs \
        -o "$html_file" \
        --template="$TEMPLATE" \
        --to=html \
        --metadata title="$title" \
        --standalone

    perl -i -pe "s|$ORNAMENT_MARKER|$ORNAMENT_HTML|g" "$html_file"
    perl -i -pe 's|<p>\s*(<div class="ornament">.*?</div>)\s*</p>|$1|g' "$html_file"

    rm "$temp_md"
    echo "✓ Generated $html_file"
}

while IFS=$'\t' read -r id kind source public_base title section voice formats; do
    if [[ "$id" == "id" || -z "$id" ]]; then
        continue
    fi

    case "$kind" in
        tex)
            process_tex "$source" "${public_base}.html" "$title"
            ;;
        md)
            process_md "$source" "${public_base}.html" "$title"
            ;;
        static-html)
            ;;
    esac
done < "$PUBLICATIONS_FILE"

echo "--- HTML Build Complete ---"
