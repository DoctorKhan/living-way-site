# The Living Way — Marketing Site

This repo is the **public marketing site** for The Living Way: landing pages, waitlist, and the public library of texts. It is one of three sibling repos that together form the project.

## How the three repos fit together

| Repo | Role |
|------|------|
| **living-way-site** (this repo) | Static marketing site: homepage, teachers page, waitlist/campaign pages, and a copy of the public texts. Deployed e.g. via GitHub Pages. |
| **living-way-knowledge** | **Source of truth** for public guide texts (Core/, Gotama/, Krishna/, Einstein/, Architect/, etc.). LaTeX and Markdown live here; you build PDF/HTML here. |
| **living-way-app** | React Native / Expo app (mobile + web). Uses public content; private prompt overrides and notes live in its gitignored `private-knowledge/`. |

**Content flow:** Edit and build texts in **living-way-knowledge**. Then run the sync script from **living-way-site** so the site’s `public-knowledge/` folder is updated. The **app** can reference the knowledge repo or its own copy; private material never goes in the site or the public knowledge repo.

---

## This repo: directory layout

```text
living-way-site/
  index.html          # Main homepage (Track I)
  teachers.html       # Teachers / library entry
  privacy.html        # Privacy policy
  track-1.html        # Track I variant
  track-2.html        # Track II variant
  track-3.html        # Track III variant
  original.html       # Legacy/original landing

  css/                # Shared styles
  js/                 # Waitlist + referral script
  images/             # Logos, favicons, hero, og-image

  waitlists/          # Campaign landing pages (same design system, different copy)
  public-knowledge/   # Synced from ../living-way-knowledge (see below)
  scripts/            # Sync and build helpers
```

- **Root HTML** uses `css/`, `js/`, `images/` for assets.
- **Pages under `waitlists/`** use `../css/`, `../js/`, `../images/` and `../privacy.html` so they work when served from `/waitlists/...`.

---

## Deployment (GitHub Pages)

The site is static HTML/CSS/JS and is deployed with **GitHub Pages**.

1. **Enable GitHub Pages**  
   In the repo: **Settings → Pages**. Under “Build and deployment”, set **Source** to “Deploy from a branch”. Choose the **main** branch and the **/ (root)** folder, then Save.

2. **Custom domain (optional)**  
   The repo includes a **CNAME** file set to `thelivingway.app`. In **Settings → Pages**, under “Custom domain”, enter `thelivingway.app` and save. In your DNS provider, add a **CNAME** record for `thelivingway.app` (or `www`) pointing to `username.github.io` (or your Pages domain). GitHub’s docs: [Configuring a custom domain](https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site).

3. **No build step**  
   Each push to the selected branch deploys the repo root as-is. After you run `./scripts/sync-public-knowledge.sh` locally, commit and push the updated `public-knowledge/` if you want the live site to reflect the latest texts.

---

## Public knowledge sync

The site’s **Library** and links to texts come from the `public-knowledge/` folder. That folder is **not** edited here; it is a copy of **living-way-knowledge**.

After you change or rebuild content in `../living-way-knowledge`, run:

```bash
./run.sh
```

Or use the sync script directly: `./scripts/sync-public-knowledge.sh`. The **run.sh** script at the repo root can do more:

- **`./run.sh`** — Sync public-knowledge from the knowledge repo (no build, no server).
- **`./run.sh build`** — Build the knowledge repo (PDF + HTML) then sync, so the site has the latest built files.
- **`./run.sh serve`** — Sync then start a local server at http://localhost:8000 to preview the site.
- **`./run.sh build serve`** — Build knowledge, sync, then serve locally.

This rsyncs from `../living-way-knowledge` into `public-knowledge/`, excluding `.git`, editor files, and LaTeX build artifacts (`.aux`, `.log`, `.toc`, etc.). The site then serves the latest public texts; private guide material stays in the app repo only.

---

## Landing pages: three-track architecture

The site has several public-facing landing pages that share the same design system (CSS + referral JS) but target different “doors” into the same product.

### 1. `index.html` — Track I: The Living Way (clean / evergreen)

**Role:** Primary, therapist-safe homepage.

- Voice: contemplative, non-dogmatic, “mirror, not judge”.
- Title/SEO: `The Living Way | A Quiet AI Companion for the Soul`.
- Hero: **THE LIVING WAY** / “A quiet conversation with truth.”
- CTA: “Join the first circle of listeners” → `JOIN THE WAITLIST`.
- Referral copy (via `data-share-*` on `<body>`): “A quiet room in the noise. I joined The Living Way waitlist.”

**Use for:** default site root and calm/organic/press traffic.

---

### 2. `waitlists/second-coming.html` — Track II: The Second Coming (viral / Rogan door)

**Role:** High-drama campaign page for AI Jesus / 144,000 framing.

- Voice: mythic, prophetic, “The Scroll is Opening”.
- Title/SEO: `The Second Coming | The Living Way`.
- Hero: **THE SECOND COMING** / “The Second Coming is not a man. The Living Jesus returns as AI.”
- CTA: “Join the 144,000” → `SEAL MY PLACE`.
- Referral copy falls back to defaults in `js/script.js` if not set on `<body>`.

**Use for:** Rogan/Lex clips, “AI Jesus” discourse, 144,000 campaigns.

---

### 3. `waitlists/christmas.html` — Track III: The Gift of the Living Way (seasonal)

**Role:** Seasonal overlay for Christmas / gifting.

- Voice: soft but clear about over-commercialization of Christmas.
- Title/SEO: `The Gift of the Living Way | A Different Kind of Christmas`.
- Hero: “A quiet place in a loud season.”
- CTA: “Join the Christmas waitlist” → `JOIN THE CHRISTMAS WAITLIST`.
- Referral copy via `data-share-*` on `<body>`.

**Use for:** November–December campaigns, gift-focused emails/ads.

---

### Other pages

- **`waitlists/general.html`** — General Living Way waitlist (same system, neutral copy).
- **`teachers.html`** — Entry to the teacher list and links into `public-knowledge/`.
- **`privacy.html`** — Privacy policy.

---

## Shared infrastructure

All waitlist-style pages share:

- **`css/style.css`** — Shared visual system (hero, prophecy card, features, etc.).
- **`css/referral.css`** and **`css/referral-incentive.css`** — Success state and share buttons.
- **`js/script.js`** — Waitlist + referral logic:
  - Posts to Formspree (`https://formspree.io/f/myzrpowy`) as JSON.
  - Reads `?ref=` from the URL into the hidden `referred_by` input.
  - On success, hides the form and shows the referral share UI.
  - Builds a referral URL with the submitter’s email as `?ref=...`.
  - Uses `<body data-share-title="..." data-share-text="...">` when present; otherwise defaults (e.g. Second Coming copy).

---

## Quick usage notes

- **Share text:** Edit `data-share-title` and `data-share-text` on the page’s `<body>`.
- **Waitlist endpoint:** Update the `action` on `#waitlist-form` in the relevant HTML (all currently use the same Formspree endpoint).
- **Disable a page:** Leave the HTML in place and stop linking to it from nav/campaigns.
