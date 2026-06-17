'use strict';

/**
 * DEMO MODE. When there's no ANTHROPIC_API_KEY, Heckleton still works — he just
 * runs on a local heuristic instead of Claude. Good enough to click through the
 * whole product; obviously not as sharp as the real thing.
 */

const RISKY = [
  { re: /\b(layoff|laid off|riff|downsiz|let go)\b/i, cat: 'Layoff tone-deafness', sev: 'high',
    roast: "Posting about layoffs to farm engagement? Bold. Wrong, but bold.", fix: 'Lead with what you learned or how you helped people land, not with the trauma as a hook.' },
  { re: /\b(crush|killed it|grind|hustle|rise and grind|sigma|10x)\b/i, cat: 'Hustle-porn cliché', sev: 'medium',
    roast: 'Hustle-porn vocabulary detected. The 2019 called; it wants its LinkedIn back.', fix: 'Swap the bravado for one concrete result with a number you can actually defend.' },
  { re: /\b(always|never|everyone|nobody|guaranteed|literally the best|#1)\b/i, cat: 'Unverifiable absolute', sev: 'medium',
    roast: 'Absolute claim with zero evidence. Heckleton would like to see a source, or a lawyer.', fix: 'Qualify it ("in our case", "for most teams") or back it with a real figure.' },
  { re: /\b(\d+%|\$\d|\d+x revenue|doubled|tripled)\b/i, cat: 'Metric without proof', sev: 'medium',
    roast: 'Big number, no receipts. People will ask. Be ready or be quiet.', fix: 'Add the timeframe, the baseline, and the source so the metric survives a reply-guy.' },
  { re: /\b(cried|tears|parking lot|vulnerable|broke down|rock bottom)\b/i, cat: 'Performative vulnerability', sev: 'medium',
    roast: 'The parking-lot-cry genre. We can see the engagement-bait from space.', fix: 'Keep the emotion, cut the performance. End on the insight, not the sob.' },
  { re: /\b(AI will replace|AI replaces|robots took|disrupt|game-?changer|paradigm)\b/i, cat: 'AI hype / buzzword soup', sev: 'low',
    roast: 'Buzzword bingo. "Paradigm" is doing a lot of unpaid labor here.', fix: 'Name the specific thing that changed and the specific person it helps.' },
  { re: /\b(confidential|NDA|under wraps|client name|our customer [A-Z])\b/i, cat: 'Possible confidentiality leak', sev: 'high',
    roast: "Naming specifics that smell NDA-shaped. Legal is going to love this thread.", fix: 'Anonymize the customer and strip any numbers you were not cleared to share.' },
  { re: /\b(agree\?|thoughts\?|am i wrong|who else|comment below|drop a)\b/i, cat: 'Engagement-bait CTA', sev: 'low',
    roast: '"Agree?" — the tell of a post with nothing to say.', fix: 'Replace the bait with a genuine question only your audience could answer.' },
];

function vet({ draft, platform, severity }) {
  const lines = draft.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  const critiques = [];
  for (const line of lines) {
    for (const r of RISKY) {
      if (r.re.test(line)) {
        critiques.push({ line, sensitivity: r.cat, severity: r.sev, roast: r.roast, fix: r.fix });
        break;
      }
    }
  }
  const wordy = draft.split(/\s+/).length > 220;
  if (wordy) critiques.push({ line: '(the whole thing)', sensitivity: 'Length / no payoff', severity: 'low',
    roast: 'It is long. Heckleton fell asleep around paragraph three.', fix: 'Cut 30%. Put the takeaway in the first two lines.' });

  const sevWeight = { low: 8, medium: 18, high: 30 };
  let riskScore = Math.min(95, critiques.reduce((s, c) => s + sevWeight[c.severity], 8) + Number(severity) * 3);
  if (!critiques.length) riskScore = 12;
  const angryMode = riskScore >= 70;
  const expression = angryMode ? 'angry' : riskScore >= 45 ? 'gleeful' : riskScore >= 25 ? 'skeptical' : 'smug';

  const verdict = !critiques.length
    ? "Annoyingly fine. I looked for blood and found a paper cut. Ship it."
    : angryMode
    ? "No. Absolutely not. Put it down and back away from the keyboard."
    : "It's salvageable, which is the meanest thing I can say about it.";

  const safer = `${lines[0] || draft.slice(0, 80)}\n\nHere's what actually happened, with the receipts — and what you can steal from it.`;
  return {
    riskScore, expression, angryMode, verdict,
    keepThis: lines[0] ? `The opening line ("${lines[0].slice(0, 60)}...") has a pulse. Don't kill it in editing.` : 'Hard to find. Try harder.',
    critiques: critiques.length ? critiques : [{ line: '(none)', sensitivity: 'No glaring landmines', severity: 'low', roast: 'Suspiciously clean. I trust nothing.', fix: 'Tighten the hook and add one concrete number.' }],
    fixes: [
      { label: 'Safer', rewrite: safer, note: 'Strips the landmines, keeps your point. The one you post when legal is watching.' },
      { label: 'Sharper', rewrite: `${(lines[0] || 'Hot take:')}\n\nMost ${platform} posts about this are wrong. Here's the version with a spine.`, note: 'More opinion, more specificity, less hedging.' },
    ],
    _demo: true,
  };
}

function earnest({ draft }) {
  const first = draft.split(/\n+/)[0] || draft.slice(0, 60);
  return {
    take: `Honestly? There's a real idea in here. Your opening — "${first.slice(0, 70)}" — sets up something worth reading. The middle wanders a little, but the bones are good.`,
    strengths: ['You have a clear point of view', 'The opening earns attention', 'It sounds like a person, not a press release'],
    suggestions: ['Lead with the takeaway, then tell the story', 'Add one concrete example or number', 'Cut the last paragraph — you already made the point'],
    riskScore: 22, _demo: true,
  };
}

function translate({ draft, to }) {
  const native = to === 'substack'
    ? `## A first line that earns the click\n\n${draft.trim()}\n\n*(Expanded into an essay with a clear thesis and a closing turn.)*`
    : to === 'beehiiv'
    ? `**Subject:** ${draft.split(/\n/)[0].slice(0, 50)}\n\n${draft.trim()}\n\n— Skimmable, one idea, one CTA.`
    : `${draft.split(/\n/)[0]}\n\n${draft.trim()}\n\nThe takeaway in one line. ↓`;
  return {
    platform: to, translated: native,
    changes: [
      { what: `Reformatted for ${to}`, why: `${to} readers expect a different rhythm and length.` },
      { what: 'Moved the takeaway up', why: 'Native readers decide in the first two lines.' },
    ], _demo: true,
  };
}

const seedIdea = (platform, n) => ({
  title: ['The onboarding metric everyone games', 'Why your enablement deck is ignored', 'The 1:1 question that fixes ramp'][n] || 'A contrarian enablement take',
  hook: ['Your reps aren\'t lazy. Your ramp is broken.', 'Nobody reads the deck. Here\'s what they actually use.', 'I stopped asking "how\'s it going" in 1:1s. Ramp got faster.'][n] || 'Most enablement advice is recycled. This isn\'t.',
  whyNow: 'Q-planning season — leaders are auditing ramp and tooling right now.',
  framework: 'Contrarian claim → evidence → the reframe → one action to steal.',
  starterDraft: 'Most onboarding metrics measure activity, not readiness. We tracked "time to first real objection handled" instead of "courses completed" — and ramp dropped three weeks. Here\'s the one change that did it...',
  platform,
});

function brief({ date }) {
  return {
    greeting: `Ugh, it's ${date}. Fine. Here's what you should post before you ruin the timeline with another "agree?" post.`,
    headline: seedIdea('linkedin', 0),
    backups: [seedIdea('linkedin', 1), seedIdea('beehiiv', 2)],
    _demo: true,
  };
}

function winners() {
  return {
    summary: "Your winners share a spine: contrarian claim, a number, a clean takeaway. The losers are the ones where you got sentimental. Lean into the first kind.",
    topics: ['Ramp & onboarding', 'Manager coaching', 'Tooling vs. behavior'],
    frameworks: ['Contrarian claim → proof → reframe', 'Numbered list with one surprising entry', 'Short story → single lesson'],
    hookStyles: ['Myth-bust ("X isn\'t the problem")', 'Confession ("I was wrong about Y")', 'Stat-shock ("3 weeks of ramp, gone")'],
    _demo: true,
  };
}

function drive({ title }) {
  return {
    sourceTitle: title || 'Ingested doc',
    notes: 'There\'s one genuinely postable insight buried under a lot of meeting sludge. I dug it out for you. You\'re welcome.',
    ideas: [seedIdea('linkedin', 0)],
    _demo: true,
  };
}

function news({ draft }) {
  return {
    items: [
      { headline: 'Funding climate stays choppy for early-stage SaaS', area: 'startups', why: 'Founders/GTM folks are anxious about runway — tone matters.', risk: 'Triumphant "we\'re crushing it" posts read tone-deaf to a laid-off audience.' },
      { headline: 'AI copilots reshaping seller workflows', area: 'tech', why: 'Enablement teams are mid-rollout and skeptical.', risk: 'Overhyping "AI replaces SDRs" invites pile-ons.' },
      { headline: 'Enablement budgets under scrutiny in planning season', area: 'enablement', why: 'Leaders are justifying spend right now.', risk: 'Vague ROI claims with no numbers get challenged.' },
    ],
    guidance: 'Safe to post: specific, numbers-backed ramp wins. Spicy: anything that dunks while people are getting cut. Read the room.',
    _demo: true,
    _note: draft ? 'Demo mode: live news needs an API key + network. This is a representative read.' : 'Demo mode: representative news read (no live search).',
  };
}

module.exports = { vet, earnest, translate, brief, winners, drive, news };
