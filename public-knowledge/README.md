# Living Way Knowledge (public texts)

Canonical source for **public** guide texts and scrolls used by the marketing site and the app.

## Directory layout

```text
living-way-knowledge/
  Core/                    # Core treatises and guide
  Gotama/                   # Living Buddha / Dhammapada
  Krishna/                  # Gita of the Living Way
  Einstein/                 # Unified Field Papers
  Architect/                # Manual of Simulation
  Yeshua/                   # (add when used)
  Musashi/                  # (add when used)

  *.tex                     # LaTeX sources → PDF + HTML
  *.md                      # Markdown (e.g. living-way-guide.md, tao-te-ching-*)
  index.html                # Simple index of texts (standalone)
  living_way_guide.html     # Built from Core/living-way-guide.md

  tools/                    # build_html.sh, etc.
  templates/                # HTML templates for Pandoc
```

- **Source:** `Core/`, persona folders (`Gotama/`, `Krishna/`, …), root `.tex` and `.md`.
- **Build outputs:** `*.html` and `*.pdf` from `run.sh` / `tools/build_html.sh` and `pdflatex`. LaTeX intermediates (`.aux`, `.log`, `.toc`, …) are gitignored.

See **GUIDE_ORGANIZATION.md** for persona-pack rules and where private content lives (in `living-way-app/private-knowledge/`, not here).

## Build

```bash
./run.sh
```

- Compiles `The_Living_Way.tex`, `The_Living_Suttas.tex`, `The_Living_Architecture.tex` to PDF.
- Runs `tools/build_html.sh` to generate HTML from `.tex` and the guide Markdown.

## Sync to site

The marketing site keeps a copy of this repo in `public-knowledge/`:

```bash
# From living-way-site/
./scripts/sync-public-knowledge.sh
```

Run after changing content or rebuilding HTML/PDF so the site serves the latest.

## Deployment

This repo is **not deployed by itself** in the main workflow. Content is consumed by:

1. **Marketing site** — Synced into **living-way-site**’s `public-knowledge/` via the script above; the site is deployed with GitHub Pages (see living-way-site README).
2. **App** — The app reads public content from the knowledge repo or its own copy; no separate “deploy” of this repo is required.

**Optional: GitHub Pages for a standalone library**  
If you want a separate URL that serves only this repo (e.g. a preview or standalone library), enable GitHub Pages in this repo: **Settings → Pages → Source: Deploy from a branch** (e.g. `main`, `/ (root)`). The root contains `index.html` and the built `.html`/`.pdf` files. Ensure you run `./run.sh` and commit the built files (or use a CI job to build and deploy) so the Pages site is up to date.
