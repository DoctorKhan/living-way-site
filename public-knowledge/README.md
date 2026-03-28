# Living Way Knowledge (public texts)

Canonical source for **public** Living Way texts used by the marketing site and the app.

## Directory layout

```text
living-way-knowledge/
  Core/                    # Shared doctrine, guide texts, cross-tradition content
  Laozi/                   # One folder per voice / path / tradition
  Gotama/
  Krishna/                 # Gita, Madālasā lullaby, Śiva-saṅkalpa Suktam, etc.
  Einstein/
  Architect/

  *.tex                    # Curated publication / anthology sources
  *.html                   # Generated HTML outputs served by the site sync
  *.pdf                    # Generated PDF outputs served by the site sync
  index.html               # Shared library shell
  read.html                # Shared markdown reader

  tools/                   # Build helpers + `sync-public-knowledge.sh` / `public-knowledge-rsync.excludes`
  templates/               # Pandoc templates
```

- **Canonical source texts:** `Core/` and the guide folders (`Laozi/`, `Gotama/`, `Krishna/`, ...). The styled guide page **`living_way_guide.html`** is generated from **`Core/living-way-guide.md`** (same as the `read.html?doc=…` source).
- **Publication sources:** root `.tex` files for curated compilations.
- **Generated outputs:** root `*.html` and `*.pdf` from `run.sh` / `tools/build_html.sh` and `pdflatex`.

See [GUIDE_ORGANIZATION.md](GUIDE_ORGANIZATION.md) for the canonical content model, public/private boundaries, and integration rules for `../living-way-site` and `../living-way-app`.

## Build and sync

```bash
./run.sh                    # incremental PDF/HTML (only if sources newer), then sync
./run.sh incremental        # same as default
./run.sh rebuild            # force full PDF + HTML build, then sync
./run.sh build-only         # incremental build only (no sync)
./run.sh build-only force   # full build only (no sync)
./run.sh sync               # sync only (no LaTeX/HTML; e.g. after editing Markdown only)
```

- **Incremental:** Runs `pdflatex` only for a `.tex` whose `.pdf` is missing or older than the `.tex`. Runs **`tools/build_html.sh`** only if a root `.tex`, `templates/guide_template.html`, `tools/build_html.sh`, or **`Core/living-way-guide.md`** is newer than the matching `.html` (or HTML is missing).
- **Forced:** `./run.sh rebuild` (or `force`) rebuilds all three PDFs and the full HTML set regardless of mtimes.
- If `../living-way-site` and/or `../living-way-app` exist, the default path still runs **`tools/sync-public-knowledge.sh`** so Markdown and other edits reach consumers even when LaTeX/HTML were skipped.

## Sync to site and app (manual)

**Canonical rsync** is implemented once in **`tools/sync-public-knowledge.sh`**, with exclude patterns in **`tools/public-knowledge-rsync.excludes`**.

```bash
# Site (from living-way-site/)
./scripts/sync-public-knowledge.sh

# App (from living-way-app/)
./scripts/sync-public-knowledge.sh
# or: ./run.sh sync-knowledge

# Direct (from this repo — any destination)
./tools/sync-public-knowledge.sh /path/to/public-knowledge/
```

Run after changing canonical content, **`index.html`** / **`read.html`**, or rebuilding HTML/PDF so consumers serve the latest. The sync copies the whole knowledge tree, including the library index.

## Deployment

This repo is **not deployed by itself** in the main workflow. Content is consumed by:

1. **Marketing site** — Synced into **living-way-site**’s `public-knowledge/`; treat that copy as publishing output, not the primary authoring location.
2. **App** — The app consumes this repo’s public content and keeps any private overlays in its own gitignored locations; no separate deploy of this repo is required.

**Optional: GitHub Pages for a standalone library**  
If you want a separate URL that serves only this repo (e.g. a preview or standalone library), enable GitHub Pages in this repo: **Settings → Pages → Source: Deploy from a branch** (e.g. `main`, `/ (root)`). The root contains `index.html` and the built `.html`/`.pdf` files. Ensure you run `./run.sh` and commit the built files (or use a CI job to build and deploy) so the Pages site is up to date.
