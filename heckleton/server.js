'use strict';

const path = require('path');
const express = require('express');

const P = require('./lib/prompts');
const claude = require('./lib/claude');
const demo = require('./lib/demo');
const { ingest } = require('./lib/ingest');

const app = express();
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const PORT = process.env.PORT || 4173;

// Small helper: try Claude, fall back to demo, never 500 on a bad model reply.
function handler(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req.body || {});
      res.json(result);
    } catch (err) {
      console.error(`[${req.path}]`, err.message);
      res.status(400).json({ error: err.message });
    }
  };
}

app.get('/api/status', (req, res) => {
  res.json({ live: claude.live(), model: claude.MODEL });
});

app.post('/api/vet', handler(async ({ draft, platform = 'linkedin', severity = 3 }) => {
  if (!draft || !draft.trim()) throw new Error('Paste a draft first.');
  if (!claude.live()) return demo.vet({ draft, platform, severity });
  try {
    return await claude.structured({
      user: P.vetUser({ draft, platform, severity }),
      schema: P.vetSchema,
      maxTokens: 9000,
    });
  } catch (e) {
    console.error('vet fell back to demo:', e.message);
    return demo.vet({ draft, platform, severity });
  }
}));

app.post('/api/earnest', handler(async ({ draft, platform = 'linkedin' }) => {
  if (!draft || !draft.trim()) throw new Error('Paste a draft first.');
  if (!claude.live()) return demo.earnest({ draft, platform });
  try {
    return await claude.structured({ user: P.earnestUser({ draft, platform }), schema: P.earnestSchema });
  } catch (e) {
    return demo.earnest({ draft, platform });
  }
}));

app.post('/api/translate', handler(async ({ draft, from = 'linkedin', to = 'substack' }) => {
  if (!draft || !draft.trim()) throw new Error('Paste a draft first.');
  if (!claude.live()) return demo.translate({ draft, from, to });
  try {
    return await claude.structured({ user: P.translateUser({ draft, from, to }), schema: P.translateSchema });
  } catch (e) {
    return demo.translate({ draft, from, to });
  }
}));

app.post('/api/brief', handler(async ({ context }) => {
  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  if (!claude.live()) return demo.brief({ date });
  try {
    return await claude.structured({ user: P.briefUser({ date, context }), schema: P.briefSchema, maxTokens: 9000 });
  } catch (e) {
    console.error('brief fell back to demo:', e.message);
    return demo.brief({ date });
  }
}));

app.post('/api/winners', handler(async ({ posts }) => {
  if (!posts || !posts.trim()) throw new Error('Paste a few winning posts first.');
  if (!claude.live()) return demo.winners({ posts });
  try {
    return await claude.structured({ user: P.winnersUser({ posts }), schema: P.winnersSchema });
  } catch (e) {
    return demo.winners({ posts });
  }
}));

app.post('/api/drive', handler(async ({ url, token }) => {
  // Ingest is real even in demo mode — only the idea-mining falls back.
  let title = 'Pasted source';
  let content = '';
  try {
    ({ title, content } = await ingest(url, token));
  } catch (e) {
    throw new Error(`Ingestion failed: ${e.message}`);
  }
  if (!claude.live()) return demo.drive({ title });
  try {
    return await claude.structured({ user: P.driveUser({ title, content }), schema: P.driveSchema, maxTokens: 9000 });
  } catch (e) {
    return demo.drive({ title });
  }
}));

app.post('/api/news', handler(async ({ draft }) => {
  if (!claude.live()) return demo.news({ draft });
  try {
    return await claude.withWebSearch({ user: P.newsUser({ draft }) });
  } catch (e) {
    console.error('news fell back to demo:', e.message);
    return demo.news({ draft });
  }
}));

app.listen(PORT, () => {
  const mode = claude.live() ? `LIVE (${claude.MODEL})` : 'DEMO (no ANTHROPIC_API_KEY — local heuristic)';
  console.log(`\n  🧌  Heckleton is awake at http://localhost:${PORT}`);
  console.log(`      Mode: ${mode}\n`);
});
