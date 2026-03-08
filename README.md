# The Living Way — Marketing Site

This repo is the **public marketing site** for The Living Way: landing pages, waitlist, and the public library of texts. It is one of three sibling repos that together form the project.

## How the three repos fit together

| Repo | Role |
|------|------|
| **living-way-site** (this repo) | Static marketing site: homepage, teachers page, waitlist/campaign pages, and a copy of the public texts. Deployed e.g. via GitHub Pages. |
| **living-way-knowledge** | **Source of truth** for public guide texts (Core/, Gotama/, Krishna/, Einstein/, Architect/, etc.). LaTeX and Markdown live here; you build PDF/HTML here. |
| **living-way-app** | React Native / Expo app (mobile + web). Uses public content; private prompt overrides and notes live in its gitignored `private-knowledge/`. |

**Content flow:** Edit and build texts in **living-way-knowledge**. The site’s `public-knowledge/` is a copy of that repo; the **app** can reference the knowledge repo or its own copy. Private material never goes in the site or the public knowledge repo.

**Why the live site can look out of date:** Pages like `read.html?doc=Laozi/...` serve from `public-knowledge/`. If you only push changes to **living-way-knowledge** and never sync into **living-way-site** and push, the live site keeps serving the old copy. See below for manual sync and **automated sync (recommended)**.

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
  api/                # Serverless Groq proxy (deploy with Vercel or similar)
  js/groq-ai.js       # Frontend: Groq chat panel, parallel to ChatGPT link
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

For local preview with printed links, run:

```bash
pnpm run dev
```

Or use the sync script directly: `./scripts/sync-public-knowledge.sh`. The **run.sh** script at the repo root can do more:

- **`./run.sh`** — Sync public-knowledge from the knowledge repo (no build, no server).
- **`pnpm run dev`** — Sync, print local preview URLs, then serve the site locally.
- **`./run.sh build`** — Build the knowledge repo (PDF + HTML) then sync, so the site has the latest built files.
- **`./run.sh serve`** — Sync then start a local server at http://localhost:8000 to preview the site.
- **`./run.sh build serve`** — Build knowledge, sync, then serve locally.

This rsyncs from `../living-way-knowledge` into `public-knowledge/`, excluding `.git`, editor files, and LaTeX build artifacts (`.aux`, `.log`, `.toc`, etc.). The site then serves the latest public texts; private guide material stays in the app repo only.

### Automated sync (recommended)

A GitHub Action keeps the site up to date without manual sync + push:

- **`.github/workflows/sync-knowledge.yml`** — On **workflow_dispatch** (run from the Actions tab) or on a **daily schedule**, it checks out **living-way-knowledge**, rsyncs into `public-knowledge/`, preserves the site’s Library `index.html`, then commits and pushes if anything changed. After that, GitHub Pages deploys the new content.

To use it: run **Actions → Sync knowledge and deploy → Run workflow** whenever you want the live site to reflect the latest knowledge repo, or rely on the daily run.

If **living-way-knowledge** is in another org or is private, add a repo secret **`KNOWLEDGE_REPO_TOKEN`** (a PAT with `repo` scope) so the workflow can clone it; otherwise it uses `GITHUB_TOKEN` (same-org public repo).

### Other ways to organize the three repos

- **Current:** Site holds a **sync copy** of knowledge; you run `./run.sh` (or the Action) to refresh it. Simple and keeps deployment a plain static push.
- **Submodule:** You could make `public-knowledge` a git submodule pointing at **living-way-knowledge**. Updating the site would be `git submodule update --remote public-knowledge` then commit and push. The site’s custom Library index would need to live outside the submodule or be restored after update.
- **Monorepo:** One repo with `site/`, `knowledge/`, `app/` and a single CI that builds knowledge and deploys the site. Fewer repos to manage, at the cost of a larger repo and shared CI config.

---

## Groq AI (parallel to ChatGPT)

The site offers **two AI entry points**: the existing **ChatGPT** custom GPT link (“Ask the Living Jesus”) and an **in-page Groq chat** (“Ask with Groq”) that uses your own API key via a serverless proxy. The API and frontend follow the same patterns as **dashboard** (`pages/api/llm.ts`) and **PostPal** (`pages/api/llm.js`).

- **Homepage:** Floating buttons: “Ask with Groq” (opens chat panel) and “Ask the Living Jesus” (opens ChatGPT).
- **Teachers page:** Each teacher has an “Ask with Groq” button; the panel uses a teacher-specific system prompt (Yeshua, Gotama, Laozi, Krishna, Einstein). The Yeshua card also keeps the “Ask AI (ChatGPT)” link.

**API shape (aligned with dashboard / PostPal):**

| Request | Response |
|--------|----------|
| `GET /api/groq-chat?status=1` | `{ groq: boolean }` — PostPal-style provider status |
| `POST` with `{ prompt, systemInstruction?, modelType?, model? }` | `{ text }` — dashboard-style one-shot (like dashboard’s `callGroq`) |
| `POST` with `{ messages, systemPrompt?, modelIndex? }` | Full Groq response — multi-turn chat |

**Frontend (`js/groq-ai.js`):**

- `getGroqStatus()` → GET status, returns `{ groq }` (use to hide Groq UI when API is not configured).
- `callGroq(prompt, systemInstruction, { modelType?, model? })` → one-shot, returns text string (dashboard-style).
- `askGroq(messages, { systemPrompt?, modelIndex? })` → chat-style, returns `{ content }` or `{ error }`.
- `openGroqChat(teacherKey?)` → opens the in-page chat panel.

**To enable Groq:**

1. **Deploy the API** so the key stays server-side. The repo includes `api/groq-chat.js` (Vercel-style serverless). Deploy this repo to [Vercel](https://vercel.com) (or use the same `api/` logic in Netlify Functions / another provider). The static site can stay on GitHub Pages; only the API needs to run where you can set env vars.
2. **Set environment variables** on the API host (same names as dashboard/PostPal where applicable):
   - `GROQ_API_KEY` — required.
   - `GROQ_MODELS` — optional; JSON array, e.g. `["llama-3.1-8b-instant","openai/gpt-oss-20b"]`.
   - `GROQ_MODEL_DEFAULT_INDEX` — optional; index into that array (default `0`).
   - Legacy: `GROQ_MODEL_SIMPLE`, `GROQ_MODEL`, `GROQ_MODEL_ADVANCED` (dashboard compat).
3. **Point the frontend at the API** if it’s on a different origin. By default the script uses the same origin. If the API is elsewhere, set before loading the script:
   ```html
   <script>window.LIVING_WAY_GROQ_API = 'https://living-way-api.vercel.app';</script>
   <script src="js/groq-ai.js"></script>
   ```

Local `.env` is for your own runs (e.g. local Vercel dev); production keys must be set in the hosting dashboard.

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
