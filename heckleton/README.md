# 🧌 Heckleton

A pre-publish **post-vetting troll** for your enablement content. Paste a draft,
pick a platform, set the severity dial — and Heckleton roasts it *before* the
internet does. He's mean, but he's right: every jab is anchored to a real
sensitivity, and every critique comes with a fix you can actually paste in.

Cute-ugly, hand-drawn, slightly wonky — cream paper, charcoal ink, tomato-red
accents, all framed in old-desktop window-chrome panes.

## What's in the box

- **Heckleton's Brief** — every load, one headline post idea + two backups, each
  with a hook, why-now angle, framework, and a starter draft you can **Draft this →**
  straight into the vetting flow.
- **The vetting workbench** — paste a draft, choose **LinkedIn / beehiiv / Substack**,
  set the severity dial (*mild → scorched earth*). Get back a **risk score**,
  **line-by-line critiques** tied to real sensitivities, and a **fixer pane** with
  full rewrite options. Heckleton's portrait reacts with four expressions and an
  **angry mode** that triggers when risk is high (≥ 70).
- **Earnest friend** — a button that drops the troll act for a sincere, kind take.
- **Platform translator** — rewrite a post natively for another platform.
- **Drive / Notion connector** — paste a page URL + integration token; Heckleton
  ingests the **full page (toggles included)** and mines tomorrow's idea.
- **LinkedIn winners** — paste top-performing posts; he distills the topics,
  frameworks, and hook styles that work for *you* (and feeds them to the Brief).
- **Live news cycle** — scans startups / tech / enablement right now and flags
  posts that could land poorly given the current context.

## Run it

```bash
cd heckleton
npm install
export ANTHROPIC_API_KEY=sk-ant-...   # optional — see Demo mode
npm start
```

Open <http://localhost:4173>.

### Demo mode

No API key? Heckleton still runs end-to-end on a **local heuristic** — the whole
UI is clickable, critiques are real-ish, faces and angry mode work. Set
`ANTHROPIC_API_KEY` to get the actual roast from Claude.

| Var | Default | Notes |
| --- | --- | --- |
| `ANTHROPIC_API_KEY` | — | Live mode. Without it: demo mode. |
| `HECKLETON_MODEL` | `claude-opus-4-8` | Anthropic's most capable Opus-tier model. |
| `PORT` | `4173` | Dashboard port. |

## Deploy (host it) — Render

This repo ships a Render Blueprint (`render.yaml` at the repo root), so hosting
is mostly clicks:

1. Push to GitHub (already done if you're reading this on `main`).
2. In [Render](https://render.com): **New → Blueprint**, connect this repo, and
   approve the `heckleton` service it detects.
3. (Optional, for real roasts) In the service's **Environment** tab, add a secret
   `ANTHROPIC_API_KEY`. Leave it unset to run in demo mode. **Never commit the key**
   — `render.yaml` marks it `sync: false` precisely so it lives only in the dashboard.
4. Render builds (`npm install`) and starts (`npm start`); you get a public
   `…onrender.com` URL. Every push to the deploy branch auto-redeploys.

> Free instances sleep after ~15 min idle, so the first request after a nap is
> slow (~30–50s) while it wakes. Fine for a demo; bump to a paid instance for
> always-on.

Other Node hosts (Railway, Fly.io, a VM) work too — they just need
`npm install` then `npm start`, with `PORT` and `ANTHROPIC_API_KEY` set in the
environment. The server already reads `process.env.PORT`.

## How it works

- **Backend** (`server.js` + `lib/`) — Express. Each feature is one endpoint that
  calls Claude with **structured outputs** (`output_config.format`) so replies are
  always valid JSON, and **adaptive thinking**. The news layer uses the
  `web_search_20260209` server tool for live context. If a Claude call fails or
  there's no key, it falls back to `lib/demo.js` so the app never dead-ends.
- **Connector** (`lib/ingest.js`) — fetches the full page server-side. Notion pages
  recurse children so **toggle contents are flattened in**; Google Docs pull the
  body text.
- **Frontend** (`public/`) — no build step. Vanilla JS, Google Fonts (Fraunces +
  JetBrains Mono), and an SVG `feTurbulence`/`feDisplacementMap` filter that gives
  every pane its scratchy hand-drawn wobble. Heckleton's five faces are inline SVG.

### Connector tokens

- **Notion** — create an internal integration, share the page with it, paste the
  page URL + the integration secret. Heckleton walks the block tree (including
  nested toggles).
- **Google Docs** — paste the doc URL + an OAuth access token with
  `documents.readonly` scope.

Tokens are used per-request server-side and never stored.
