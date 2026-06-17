'use strict';

/* ----------------------------------------------------------------------
   Heckleton's faces. One lumpy troll, five moods. Cute-ugly by design.
   ---------------------------------------------------------------------- */
const FACE_PARTS = {
  deadpan:   { brows: 'M52 64 L78 62 M122 62 L148 64', eyes: 'dots', mouth: 'M70 132 L130 132' },
  skeptical: { brows: 'M52 58 L78 66 M122 64 L148 60', eyes: 'half', mouth: 'M72 136 Q100 128 128 138' },
  smug:      { brows: 'M52 62 L78 60 M122 60 L150 66', eyes: 'half', mouth: 'M70 130 Q100 150 132 128' },
  gleeful:   { brows: 'M50 56 L80 62 M120 62 L150 56', eyes: 'wide', mouth: 'M64 126 Q100 168 136 126 Q100 150 64 126 Z' },
  angry:     { brows: 'M50 70 L80 56 M120 56 L150 70', eyes: 'glare', mouth: 'M66 144 Q100 120 134 144 Q100 138 66 144 Z' },
};

function eyeSvg(kind, cx) {
  if (kind === 'dots') return `<circle cx="${cx}" cy="86" r="7" fill="#2b2823"/>`;
  if (kind === 'half') return `<path d="M${cx-13} 84 Q${cx} 92 ${cx+13} 84" stroke="#2b2823" stroke-width="4" fill="none"/><circle cx="${cx}" cy="88" r="5" fill="#2b2823"/>`;
  if (kind === 'wide') return `<circle cx="${cx}" cy="86" r="13" fill="#fff" stroke="#2b2823" stroke-width="3"/><circle cx="${cx+2}" cy="88" r="6" fill="#2b2823"/>`;
  if (kind === 'glare') return `<circle cx="${cx}" cy="88" r="11" fill="#fff" stroke="#2b2823" stroke-width="3"/><circle cx="${cx}" cy="90" r="5" fill="#e0432a"/>`;
  return '';
}

function faceSvg(expr) {
  const p = FACE_PARTS[expr] || FACE_PARTS.deadpan;
  const mouthFill = (expr === 'gleeful' || expr === 'angry') ? '#b8331e' : 'none';
  const skin = expr === 'angry' ? '#cfae5e' : '#bcd49a';
  return `<svg viewBox="0 0 200 200" filter="url(#scratch)" aria-label="Heckleton, ${expr}">
    <!-- lumpy head -->
    <path d="M40 96 Q34 44 92 38 Q150 32 162 84 Q172 130 138 158 Q100 184 64 158 Q34 138 40 96 Z" fill="${skin}" stroke="#2b2823" stroke-width="4"/>
    <!-- ears -->
    <path d="M40 96 Q20 88 26 110 Q34 118 46 112" fill="${skin}" stroke="#2b2823" stroke-width="4"/>
    <path d="M162 90 Q184 84 178 108 Q170 116 156 108" fill="${skin}" stroke="#2b2823" stroke-width="4"/>
    <!-- hair tufts -->
    <path d="M70 40 L66 22 M96 36 L96 16 M124 40 L132 22" stroke="#2b2823" stroke-width="4" fill="none" stroke-linecap="round"/>
    <!-- brows -->
    <path d="${p.brows}" stroke="#2b2823" stroke-width="5" fill="none" stroke-linecap="round"/>
    <!-- eyes -->
    ${eyeSvg(p.eyes, 70)} ${eyeSvg(p.eyes, 130)}
    <!-- big nose -->
    <path d="M100 92 Q90 116 86 124 Q100 132 114 124 Q110 116 100 92 Z" fill="${skin}" stroke="#2b2823" stroke-width="3.5"/>
    <circle cx="92" cy="123" r="2.5" fill="#2b2823"/><circle cx="108" cy="123" r="2.5" fill="#2b2823"/>
    <!-- mouth -->
    <path d="${p.mouth}" stroke="#2b2823" stroke-width="4.5" fill="${mouthFill}" stroke-linejoin="round"/>
    <!-- snaggle tooth -->
    ${expr !== 'gleeful' ? '<path d="M112 132 L116 142 L120 132 Z" fill="#fff" stroke="#2b2823" stroke-width="2"/>' : ''}
  </svg>`;
}

function setFace(expr, angry) {
  document.getElementById('face').innerHTML = faceSvg(expr || 'deadpan');
  document.getElementById('heckletonStage').classList.toggle('angry', !!angry);
}

/* ----------------------------------------------------------------------
   Wiring
   ---------------------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const SEV_NAMES = { 1: 'Mild', 2: 'Spicy', 3: 'Brutal', 4: 'Savage', 5: 'Scorched Earth' };
const esc = (s) => String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

async function api(path, body) {
  const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Heckleton choked on that.');
  return data;
}

function busy(btn, on, label) {
  if (!btn) return;
  btn.disabled = on;
  if (on) { btn.dataset.label = btn.textContent; btn.textContent = label || 'Thinking…'; }
  else if (btn.dataset.label) btn.textContent = btn.dataset.label;
}

/* ---------- status badge ---------- */
(async function status() {
  try {
    const s = await (await fetch('/api/status')).json();
    const badge = $('modeBadge');
    badge.textContent = s.live ? `● live · ${s.model}` : '● demo mode';
    badge.className = 'topbar-status ' + (s.live ? 'live' : 'demo');
  } catch (_) { $('modeBadge').textContent = 'offline'; }
})();

/* ---------- severity dial ---------- */
$('severity').addEventListener('input', (e) => { $('sevLabel').textContent = SEV_NAMES[e.target.value]; });

/* ---------- VET ---------- */
$('roastBtn').addEventListener('click', async () => {
  const draft = $('draft').value.trim();
  if (!draft) { setFace('skeptical'); $('verdict').textContent = 'Nothing pasted. Heckling the void.'; return; }
  busy($('roastBtn'), true, '🔥 Roasting…');
  setFace('gleeful');
  $('verdict').textContent = 'Reading. Sharpening. Cracking knuckles…';
  try {
    const r = await api('/api/vet', { draft, platform: $('platform').value, severity: Number($('severity').value) });
    renderVet(r);
  } catch (e) {
    $('verdict').textContent = e.message;
    setFace('deadpan');
  } finally { busy($('roastBtn'), false); }
});

function renderVet(r) {
  setFace(r.expression, r.angryMode);
  $('riskNum').textContent = r.riskScore;
  $('riskFill').style.width = Math.max(2, Math.min(100, r.riskScore)) + '%';
  $('verdict').textContent = r.verdict;

  let html = '';
  if (r.critiques && r.critiques.length) {
    html += '<div class="results-section"><h3>Line-by-line</h3>';
    for (const c of r.critiques) {
      html += `<div class="crit ${esc(c.severity)}">
        <div class="quote">"${esc(c.line)}"</div>
        <div class="cat">${esc(c.sensitivity)} · ${esc(c.severity)}</div>
        <p class="roast">${esc(c.roast)}</p>
        <div class="fix"><b>FIX →</b> ${esc(c.fix)}</div>
      </div>`;
    }
    html += '</div>';
  }
  if (r.fixes && r.fixes.length) {
    html += '<div class="results-section"><h3>Fixer — rewrite options</h3><div class="fixer">';
    for (const f of r.fixes) {
      html += `<div class="fix-opt">
        <h4>${esc(f.label)}</h4>
        <p class="note">${esc(f.note)}</p>
        <pre>${esc(f.rewrite)}</pre>
        <button class="btn small use-fix">Use this →</button>
      </div>`;
    }
    html += '</div></div>';
  }
  if (r.keepThis) html += `<div class="results-section"><h3>Grudging praise</h3><div class="keep">${esc(r.keepThis)}</div></div>`;
  if (r._demo) html += '<div class="demo-flag">demo mode — local heuristic, not Claude. Set ANTHROPIC_API_KEY for the real roast.</div>';

  $('resultsTitle').textContent = r.angryMode ? '🚨 ANGRY MODE — high risk' : 'Critique';
  $('resultsBody').innerHTML = html;
  $('resultsPane').hidden = false;
  // wire "use this" buttons to swap the draft
  document.querySelectorAll('.use-fix').forEach((b) => b.addEventListener('click', (ev) => {
    const pre = ev.target.closest('.fix-opt').querySelector('pre');
    $('draft').value = pre.textContent;
    $('draft').scrollIntoView({ behavior: 'smooth', block: 'center' });
  }));
  $('resultsPane').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ---------- EARNEST ---------- */
$('earnestBtn').addEventListener('click', async () => {
  const draft = $('draft').value.trim();
  if (!draft) { $('verdict').textContent = 'Paste a draft and I\'ll be nice. Once.'; return; }
  busy($('earnestBtn'), true, '🤝 Being kind…');
  setFace('deadpan');
  $('verdict').textContent = 'Fine. Sincere mode. Don\'t tell anyone.';
  try {
    const r = await api('/api/earnest', { draft, platform: $('platform').value });
    $('riskNum').textContent = r.riskScore;
    $('riskFill').style.width = Math.max(2, Math.min(100, r.riskScore)) + '%';
    let html = `<div class="results-section"><h3>Earnest friend</h3><div class="keep">${esc(r.take)}</div></div>`;
    html += listSection('What\'s working', r.strengths);
    html += listSection('What to strengthen', r.suggestions);
    if (r._demo) html += '<div class="demo-flag">demo mode — set ANTHROPIC_API_KEY for the real read.</div>';
    $('resultsTitle').textContent = 'Earnest take';
    $('resultsBody').innerHTML = html;
    $('resultsPane').hidden = false;
    $('resultsPane').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) { $('verdict').textContent = e.message; }
  finally { busy($('earnestBtn'), false); }
});

/* ---------- TRANSLATE ---------- */
$('translateBtn').addEventListener('click', async () => {
  const draft = $('draft').value.trim();
  if (!draft) { $('verdict').textContent = 'Nothing to translate. Paste a draft.'; return; }
  const from = $('platform').value;
  const to = $('translateTo').value;
  busy($('translateBtn'), true, 'Translating…');
  setFace('smug');
  try {
    const r = await api('/api/translate', { draft, from, to });
    let html = `<div class="results-section"><h3>Translated · ${esc(from)} → ${esc(to)}</h3>
      <div class="fix-opt"><pre>${esc(r.translated)}</pre><button class="btn small use-translate">Use this →</button></div></div>`;
    html += '<div class="results-section"><h3>What changed</h3>';
    (r.changes || []).forEach((c) => { html += `<div class="crit low"><b>${esc(c.what)}</b><div class="fix">${esc(c.why)}</div></div>`; });
    html += '</div>';
    if (r._demo) html += '<div class="demo-flag">demo mode.</div>';
    $('resultsTitle').textContent = `Translation → ${to}`;
    $('resultsBody').innerHTML = html;
    $('resultsPane').hidden = false;
    document.querySelector('.use-translate').addEventListener('click', () => {
      $('draft').value = r.translated;
      $('platform').value = to;
      $('draft').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    $('resultsPane').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (e) { $('verdict').textContent = e.message; }
  finally { busy($('translateBtn'), false); }
});

function listSection(title, items) {
  if (!items || !items.length) return '';
  return `<div class="results-section"><h3>${esc(title)}</h3><ul class="tagline-list">${items.map((i) => `<li>${esc(i)}</li>`).join('')}</ul></div>`;
}

/* ---------- BRIEF ---------- */
function ideaCard(idea, tag, headline) {
  return `<div class="idea-card ${headline ? 'headline' : ''}">
    <div class="idea-tag">${esc(tag)}</div>
    <h3>${esc(idea.title)}</h3>
    <p class="hook">"${esc(idea.hook)}"</p>
    <p class="idea-meta"><b>why now</b> · ${esc(idea.whyNow)}</p>
    <p class="idea-meta"><b>framework</b> · ${esc(idea.framework)}</p>
    <div class="idea-starter">${esc(idea.starterDraft)}</div>
    <span class="platform-pill">${esc(idea.platform)}</span>
    <button class="btn small draft-this" data-draft="${encodeURIComponent(idea.starterDraft)}" data-platform="${esc(idea.platform)}">Draft this →</button>
  </div>`;
}

async function loadBrief() {
  $('briefBody').innerHTML = '<div class="loading">Waking Heckleton for today\'s brief…</div>';
  try {
    // feed any distilled winners / news context we have stashed
    const r = await api('/api/brief', { context: window.__heckletonContext || '' });
    let html = `<p class="greeting">${esc(r.greeting)}</p>`;
    html += ideaCard(r.headline, '★ headline idea', true);
    (r.backups || []).forEach((b, i) => { html += ideaCard(b, `backup ${i + 1}`, false); });
    if (r._demo) html += '<div class="demo-flag" style="grid-column:1/-1">demo mode — set ANTHROPIC_API_KEY for fresh, current ideas.</div>';
    $('briefBody').innerHTML = html;
    document.querySelectorAll('.draft-this').forEach((b) => b.addEventListener('click', (ev) => {
      const t = ev.target;
      $('draft').value = decodeURIComponent(t.dataset.draft);
      if (t.dataset.platform) $('platform').value = t.dataset.platform;
      $('draft').scrollIntoView({ behavior: 'smooth', block: 'center' });
      setFace('smug');
      $('verdict').textContent = 'Seeded. Now make it not terrible.';
    }));
  } catch (e) {
    $('briefBody').innerHTML = `<div class="err">${esc(e.message)}</div>`;
  }
}
$('briefRefresh').addEventListener('click', loadBrief);

/* ---------- DRIVE / NOTION ---------- */
$('driveBtn').addEventListener('click', async () => {
  const url = $('driveUrl').value.trim();
  const token = $('driveToken').value.trim();
  const out = $('driveOut');
  if (!url || !token) { out.innerHTML = '<div class="err">Need a URL and a token.</div>'; return; }
  busy($('driveBtn'), true, 'Ingesting…');
  out.innerHTML = '<div class="loading">Reading the whole page, toggles and all…</div>';
  try {
    const r = await api('/api/drive', { url, token });
    let html = `<h4>${esc(r.sourceTitle)}</h4><p class="muted">${esc(r.notes)}</p>`;
    (r.ideas || []).forEach((idea) => { html += ideaCard(idea, 'mined idea', false); });
    if (r._demo) html += '<div class="demo-flag">demo mode — ingestion is real; idea-mining is heuristic without an API key.</div>';
    out.innerHTML = html;
    out.querySelectorAll('.draft-this').forEach((b) => b.addEventListener('click', (ev) => {
      $('draft').value = decodeURIComponent(ev.target.dataset.draft);
      if (ev.target.dataset.platform) $('platform').value = ev.target.dataset.platform;
      $('draft').scrollIntoView({ behavior: 'smooth', block: 'center' });
    }));
  } catch (e) { out.innerHTML = `<div class="err">${esc(e.message)}</div>`; }
  finally { busy($('driveBtn'), false); }
});

/* ---------- WINNERS ---------- */
$('winnersBtn').addEventListener('click', async () => {
  const posts = $('winnersIn').value.trim();
  const out = $('winnersOut');
  if (!posts) { out.innerHTML = '<div class="err">Paste some winning posts first.</div>'; return; }
  busy($('winnersBtn'), true, 'Distilling…');
  out.innerHTML = '<div class="loading">Pattern-matching your bangers…</div>';
  try {
    const r = await api('/api/winners', { posts });
    let html = `<p class="muted">${esc(r.summary)}</p>`;
    html += '<h4>topics that work</h4><ul class="tagline-list">' + (r.topics || []).map((t) => `<li>${esc(t)}</li>`).join('') + '</ul>';
    html += '<h4>frameworks</h4><ul class="tagline-list">' + (r.frameworks || []).map((t) => `<li>${esc(t)}</li>`).join('') + '</ul>';
    html += '<h4>hook styles</h4><ul class="tagline-list">' + (r.hookStyles || []).map((t) => `<li>${esc(t)}</li>`).join('') + '</ul>';
    if (r._demo) html += '<div class="demo-flag">demo mode.</div>';
    out.innerHTML = html;
    // stash as context so the Brief can use it
    window.__heckletonContext = `WINNERS PLAYBOOK:\n${r.summary}\nTopics: ${(r.topics || []).join(', ')}\nFrameworks: ${(r.frameworks || []).join(', ')}\nHooks: ${(r.hookStyles || []).join(', ')}`;
  } catch (e) { out.innerHTML = `<div class="err">${esc(e.message)}</div>`; }
  finally { busy($('winnersBtn'), false); }
});

/* ---------- NEWS ---------- */
$('newsBtn').addEventListener('click', async () => {
  const out = $('newsOut');
  busy($('newsBtn'), true, 'Scanning…');
  out.innerHTML = '<div class="loading">Checking what the internet is mad about today…</div>';
  try {
    const r = await api('/api/news', { draft: $('draft').value.trim() });
    let html = `<p class="muted"><em>${esc(r.guidance || '')}</em></p>`;
    (r.items || []).forEach((it) => {
      html += `<div class="news-item">
        <div class="area">${esc(it.area)}</div>
        <strong>${esc(it.headline)}</strong>
        <div>${esc(it.why)}</div>
        <div class="risk">⚠ ${esc(it.risk)}</div>
      </div>`;
    });
    if (r._note) html += `<div class="demo-flag">${esc(r._note)}</div>`;
    out.innerHTML = html;
    // stash for the Brief's why-now angles
    window.__heckletonContext = (window.__heckletonContext || '') + '\nNEWS: ' + (r.items || []).map((i) => i.headline).join('; ');
  } catch (e) { out.innerHTML = `<div class="err">${esc(e.message)}</div>`; }
  finally { busy($('newsBtn'), false); }
});

/* ---------- boot ---------- */
setFace('deadpan');
loadBrief();
