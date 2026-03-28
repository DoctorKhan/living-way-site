# Content Organization and Cross-Repo Integration

This repository should stay the canonical home for all public Living Way texts.

The best working model is:

1. `living-way-knowledge` owns public content.
2. `living-way-site` publishes a synced copy of that public content.
3. `living-way-app` consumes the public content and adds app-specific metadata, prompts, and any private overlays.

## Canonical Structure

Use the repository in four zones:

```text
living-way-knowledge/
  Core/                     # Shared doctrine, guide material, non-persona texts
                            # living-way-guide.md → ../living_way_guide.html (Pandoc; see tools/build_html.sh)
  Laozi/                    # One folder per voice / path / source tradition
  Gotama/
  Krishna/                  # Gita + related Hindu Sanskrit sources (see below)
  Einstein/
  Architect/

  tools/                    # Build helpers + shared public-knowledge rsync (see below)
  templates/                # HTML templates used by the build

  The_Living_Way.tex        # Curated anthology / book-level source
  The_Living_Suttas.tex
  The_Living_Architecture.tex

  *.html                    # Generated web outputs served directly by the site sync
  *.pdf                     # Generated print outputs served directly by the site sync

  README.md
  GUIDE_ORGANIZATION.md
  index.html                # Library shell shared with the public copy
  read.html                 # Markdown reader shared with the public copy
```

## What Goes Where

## Equal-Footing Model

If the project is no longer meant to be Yeshua-centered with other guides as satellites, organize it so that **every major pathway is first-class**:

- shared material goes in `Core/`
- pathway-specific material goes in that pathway's own folder
- no single pathway gets to masquerade as the default meaning of "the Way"

In practice, that means:

- `Core/` must stay guide-neutral
- Yeshua content belongs in `Yeshua/`, not in `Core/`
- Krishna content belongs in `Krishna/`
- Gotama content belongs in `Gotama/`
- Laozi content belongs in `Laozi/`
- cross-path comparisons belong in `Core/`

### What `Core/` should become

`Core/` should hold only material that is genuinely shared across traditions, such as:

- the meta-framework of the Living Way
- comparison documents across traditions
- app-agnostic onboarding language
- bridge concepts that appear in multiple pathways

If a text would feel misleading when read as "the official foundation for every guide," it does not belong in `Core/`.

### What changes if Yeshua is one path among peers

The long-term target shape should look like this:

```text
living-way-knowledge/
  Core/                    # Shared framework, comparison texts, neutral orientation
  Yeshua/                  # Yeshuan pathway texts
  Gotama/                  # Buddhist pathway texts
  Krishna/                 # Gita / bhakti / dharma pathway texts
  Laozi/                   # Taoist pathway texts
  Einstein/                # Rational / awe / science pathway texts
  Architect/               # Meta-structural pathway texts
  Musashi/                 # Warrior / discipline pathway texts
```

This does not require a disruptive rewrite all at once. It does require a rule:

- if a document speaks in one guide's voice, it belongs with that guide
- if a document defines the shared map across guides, it belongs in `Core/`

### 1. `Core/`

Put texts here when they are not the voice of one guide, for example:

- foundational doctrine
- project-wide guides
- shared architecture texts
- cross-tradition framing

`Core/` should be the home for anything that would still make sense if every voice folder disappeared.

**Guide build:** `Core/living-way-guide.md` is the single source for the root-level `living_way_guide.html` (Pandoc + `templates/guide_template.html` in `tools/build_html.sh`). Edit the Markdown only; regenerate HTML with `./run.sh` or `./tools/build_html.sh`.

If an existing `Core/` text is clearly Yeshuan, Buddhist, Taoist, or otherwise pathway-specific, treat that as migration debt and plan to move it into the matching folder when practical.

### 2. Persona folders

Each voice or tradition gets one top-level folder:

- `Laozi/`
- `Gotama/`
- `Krishna/`
- `Einstein/`
- `Architect/`

Inside each folder, prefer one canonical Markdown file per work. Keep filenames stable and descriptive, since sibling repos may deep-link to them.

Good pattern:

```text
Laozi/
  The_Unforced_Leader_Tao_Te_Ching.md
```

#### `Krishna/` (Gita strand + Sanskrit shelf)

Use **`Krishna/`** for the Living Way Gita and for **closely related Hindu Sanskrit sources** that readers open from the same library section (not a separate persona folder). Canonical files today:

| File | Role |
|------|------|
| `The_Krishna_Path_of_the_Living_Way.md` | Primary Krishna-path anthology for the Living Way |
| `The_Gita_of_the_Living_Way.md` | Primary Krishna-strand teaching text |
| `Madalas_Lullaby_Sanskrit_and_Translation.md` | Mārkaṇḍeya Purāṇa ch. 25 (Madālasā, ślokas 11–14) |
| `Shiva_Sankalpa_Suktam_Sanskrit_and_Translation.md` | Śiva-saṅkalpa / Vājasaneyi Saṃhitā ch. 34 (six mantras) |
| `Atma_Samharana_Pranaagnihotra_Mantras_Sanskrit_and_Translation.md` | Mahānārāyaṇa Upaniṣad sec. 66 (faculty-dissolution / return-to-Brahman chant) |

The **library index** (`index.html`) lists these under **Krishna**. After adding or renaming a file here, update that section and run **`tools/sync-public-knowledge.sh`** (via the site or app wrapper scripts below) so each consumer’s `public-knowledge/` stays aligned.

**App prompts:** `living-way-app` should prefer `The_Krishna_Path_of_the_Living_Way.md` as the Krishna-path anthology when building `KRISHNA_TEXT`. Keep the individual source files as readable standalone works and reference texts.

Avoid mixing prompts, product notes, experiments, or unpublished fragments into these folders.

### 3. Root `.tex` files

Treat root `.tex` files as curated publication artifacts, not as miscellaneous content dumps.

They should represent:

- anthology books
- printable compilations
- carefully edited long-form editions

If a text begins life as a single-voice or shared source text, it should usually start in `Core/` or a voice folder and only later be pulled into a root `.tex` compilation when it is ready for publication.

### 4. Root generated outputs

Keep generated `*.html` and `*.pdf` at the repo root for now because the site sync already expects this shape. This is not the cleanest possible build layout, but it is the least disruptive layout across the sibling repos.

Agents should not move generated outputs into `dist/` or `build/` unless they also update the site sync and any app links that assume the current root-level paths.

## Shared sync tooling (`public-knowledge` mirror)

**One rsync recipe** lives here so local sync, the marketing site, CI, and the app do not drift:

| Path | Role |
|------|------|
| `tools/public-knowledge-rsync.excludes` | Patterns passed to `rsync --exclude-from=` (`.git/`, LaTeX junk, etc.) |
| `tools/sync-public-knowledge.sh` | `rsync -av --delete` from this repo’s root into a destination directory |

**How consumers invoke it** (each repo expects `living-way-knowledge` as a sibling directory):

- **Site:** `living-way-site/scripts/sync-public-knowledge.sh` → `exec ../living-way-knowledge/tools/sync-public-knowledge.sh …/public-knowledge/`
- **App:** `living-way-app/scripts/sync-public-knowledge.sh` → same destination under the app
- **CI:** `living-way-site/.github/workflows/sync-knowledge.yml` runs `bash knowledge-repo/tools/sync-public-knowledge.sh public-knowledge/`

To add or remove exclude rules, edit **`tools/public-knowledge-rsync.excludes`** only; do not duplicate `--exclude` flags in the site or workflow.

## Content Rules

- Public text lives here.
- Private prompt overlays do not live here.
- Sensitive notes do not live here.
- App-only metadata does not live here unless it is genuinely public and content-facing.
- One work should have one canonical source file.
- Prefer editing the canonical source rather than the synced copy in another repo.

## Cross-Repo Contract

### `../living-way-knowledge`

This repo is the source of truth for:

- public Markdown texts
- public LaTeX texts
- public generated HTML and PDF artifacts
- library-facing shared documents such as `index.html` (voice/work index) and `read.html` (Markdown reader); both are authored here and copied to consumers by **`tools/sync-public-knowledge.sh`** (see **Shared sync tooling** above), usually via `living-way-site/scripts/sync-public-knowledge.sh` or CI

### `../living-way-site`

This repo should treat `public-knowledge/` as a synced publishing surface, not the primary authoring location.

Use it for:

- serving the public library
- site navigation, landing pages, and marketing context
- the custom library shell around the synced texts

Do not originate new canonical text content in `public-knowledge/` unless the change is specifically about the site-owned shell files and is copied back here.

### `../living-way-app`

This repo should treat this repository as the public content dependency.

Use the app repo for:

- guide metadata
- guide selection UX
- prompt wiring
- runtime retrieval
- private overlays in gitignored files
- app-specific transforms or indexing

Do not fork public text content into the app unless there is a clear product need such as bundling, indexing, or offline packaging.

## Agent Integration Rules

When an agent works across the sibling repositories, follow this order:

1. Update canonical public content in `../living-way-knowledge`.
2. Rebuild generated artifacts when needed (`./run.sh` runs **incremental** PDF/HTML only if sources are newer than outputs, then syncs; use `./run.sh rebuild` for a full LaTeX/HTML build, `./run.sh build-only` to skip sync, or `./run.sh sync` to sync without building).
3. If you skipped automatic sync, push mirrors manually: `../living-way-site/scripts/sync-public-knowledge.sh`, `../living-way-app/scripts/sync-public-knowledge.sh`, or `./run.sh sync`.
4. Update `../living-way-app` only for metadata, prompts, indexing, navigation, or private overlays.

### If the task is a text change

- Edit the text in this repo.
- Never start by editing the site copy.
- Sync the site after the source text is final.

### If the task is a new guide

- Create a new top-level folder here for the public text.
- Add the public work there first.
- Then update app metadata and prompts in `../living-way-app`.
- Then ensure the site exposes the new guide through navigation or library pages.

### If the task is a private or sensitive instruction

- Do not add it here.
- Put it in `../living-way-app/private-knowledge/` or another non-public location.

### If the task is only a site presentation change

- If the change is to the **library shell** (`index.html`, `read.html`), edit **`living-way-knowledge` first**, then sync to the site.
- Only use `../living-way-site/scripts/sync-to-knowledge.sh` when you intentionally edited those files under `public-knowledge/` on the site and need to push them back here.

## Practical Checklist for Agents

Before moving files or inventing new folders, check whether the current sync scripts or app references assume the existing paths.

Before adding content, decide:

- Is this public or private?
- Is this shared or tied to one guide?
- Is this canonical source text or a generated publication artifact?
- Does another sibling repo only need a synced copy rather than a second source?

After changing public content, note whether the next step is:

- rebuild here
- sync to site
- update app metadata

## Recommended Near-Term Discipline

The cleanest near-term organization is not a major restructure. It is a stricter use of the structure that already exists:

- `Core/` for shared source texts
- one folder per guide for guide-specific source texts
- root `.tex` for curated compilations
- root `*.html` and `*.pdf` for generated outputs
- sibling repos consuming this repo instead of redefining it

That keeps the public library coherent without forcing a cross-repo migration.
