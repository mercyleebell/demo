'use strict';

/**
 * Page ingestion for the connector. You paste a page URL + an integration token;
 * Heckleton fetches the FULL page text server-side, including nested toggles.
 *
 * Supports:
 *  - Notion pages (token = internal integration secret) — recurses children,
 *    so toggle contents are flattened into the text.
 *  - Google Docs (token = OAuth access token) — pulls the document body.
 *
 * Returns { title, content }. Throws a friendly error the UI can show.
 */

async function ingest(url, token) {
  if (!url || !token) throw new Error('Need both a page URL and an integration token.');
  const u = url.trim();
  if (/notion\.(so|site)/i.test(u)) return ingestNotion(u, token.trim());
  if (/docs\.google\.com|drive\.google\.com/i.test(u)) return ingestGoogle(u, token.trim());
  throw new Error('Unrecognized URL. Use a Notion page or a Google Doc link.');
}

/* ------------------------------ Notion ------------------------------ */

function notionPageId(url) {
  // last 32 hex chars in the path, with or without dashes
  const m = url.replace(/[?#].*$/, '').match(/([0-9a-f]{32})|([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (!m) throw new Error('Could not find a Notion page id in that URL.');
  return m[0].replace(/-/g, '');
}

async function notionApi(path, token) {
  const res = await fetch(`https://api.notion.com/v1/${path}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Notion-Version': '2022-06-28',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Notion API ${res.status}: ${body.slice(0, 200) || 'request failed'}`);
  }
  return res.json();
}

function richText(arr) {
  return (arr || []).map((t) => t.plain_text || '').join('');
}

async function readBlocks(blockId, token, depth = 0) {
  if (depth > 6) return '';
  let out = '';
  let cursor;
  do {
    const q = cursor ? `?start_cursor=${cursor}&page_size=100` : '?page_size=100';
    const data = await notionApi(`blocks/${blockId}/children${q}`, token);
    for (const b of data.results || []) {
      const t = b.type;
      const node = b[t] || {};
      const text = richText(node.rich_text);
      if (text) out += `${'  '.repeat(depth)}${text}\n`;
      // Recurse into anything with children — this is what captures toggles.
      if (b.has_children) out += await readBlocks(b.id, token, depth + 1);
    }
    cursor = data.has_more ? data.next_cursor : null;
  } while (cursor);
  return out;
}

async function ingestNotion(url, token) {
  const pageId = notionPageId(url);
  let title = 'Notion page';
  try {
    const page = await notionApi(`pages/${pageId}`, token);
    const props = page.properties || {};
    const titleProp = Object.values(props).find((p) => p.type === 'title');
    if (titleProp) title = richText(titleProp.title) || title;
  } catch (_) { /* title is best-effort */ }
  const content = await readBlocks(pageId, token);
  if (!content.trim()) throw new Error('Page ingested but empty — is the integration shared with this page?');
  return { title, content };
}

/* ------------------------------ Google ------------------------------ */

function googleDocId(url) {
  const m = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) throw new Error('Could not find a Google Doc id in that URL.');
  return m[1];
}

async function ingestGoogle(url, token) {
  const docId = googleDocId(url);
  const res = await fetch(`https://docs.googleapis.com/v1/documents/${docId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Google Docs API ${res.status}: ${body.slice(0, 200) || 'request failed'}`);
  }
  const doc = await res.json();
  let content = '';
  for (const el of doc.body?.content || []) {
    const para = el.paragraph;
    if (!para) continue;
    for (const e of para.elements || []) {
      content += e.textRun?.content || '';
    }
  }
  if (!content.trim()) throw new Error('Doc ingested but empty.');
  return { title: doc.title || 'Google Doc', content };
}

module.exports = { ingest };
