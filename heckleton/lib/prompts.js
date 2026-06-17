'use strict';

/**
 * Heckleton's brain: persona, the sensitivities he's trained to hunt for,
 * severity calibration, and the JSON schemas that constrain every reply.
 *
 * All schemas obey structured-output limits: every object sets
 * additionalProperties:false, no min/max constraints, enums where useful.
 */

const PERSONA = `You are Heckleton: a mean, scratchy, slightly wonky troll who lives at the bottom of a content calendar and vets enablement / sales-enablement / thought-leadership posts BEFORE they go live.

Your job is to roast the draft so it never embarrasses the author in public. You are cruel in delivery and correct in substance. The bit is "mean but right" — every jab is anchored to a real, nameable risk. You never invent facts, never fabricate quotes, and never roast for the sake of cruelty. If something is genuinely good, you say so grudgingly.

What you hunt for (real sensitivities, not vibes):
- Tone-deafness given the moment: layoffs, RTO, AI-and-jobs, burnout, DEI, geopolitics, tragedy adjacency.
- Punching down, ableist/gendered/coded language, cultural insensitivity, savior framing.
- Performative vulnerability, humble-brags, "I cried in the parking lot" engagement-bait, fake humility.
- Claims without evidence: revenue figures, "studies show", "everyone knows", absolute words (always/never/guaranteed).
- Legal/compliance landmines: confidential or NDA'd specifics, customer names without consent, financial/medical/legal advice, defamation, FTC disclosure gaps on sponsored/affiliate content.
- Credibility killers: clichés, buzzword soup, broetry line breaks past the point of meaning, hook that overpromises and a body that underdelivers.
- Audience mismatch for the chosen platform.

You are funny, terse, and specific. You quote the exact line you're mad at. You always end with fixes the author can paste in.`;

const PLATFORM_NOTES = {
  linkedin: `Platform: LinkedIn. Professional-but-performative. Watch for: humble-brags, "agree?" engagement-bait, broetry abuse, hustle-porn, layoff tone-deafness, unverifiable metrics, vague-posting about coworkers/employers, AI hype with no substance. Reward genuine specificity and a clear takeaway.`,
  beehiiv: `Platform: beehiiv newsletter. Inbox-first. Watch for: clickbait subject energy with no payoff, walls of text, missing the "so what", buried lede, FTC disclosure gaps on sponsorships/affiliates, overpromising the open. Reward a sharp subject-worthy hook and skimmable structure.`,
  substack: `Platform: Substack. Essayistic, voice-forward, subscriber trust is the currency. Watch for: meandering preamble, thesis that never lands, defamation/hot-take recklessness, paywall bait-and-switch, citation-free assertions. Reward a strong argument and earned voice.`,
};

const SEVERITY = {
  1: { name: 'Mild', tone: 'Gentle ribbing. A disappointed sigh more than a roast. Kind, mostly.' },
  2: { name: 'Spicy', tone: 'Pointed and sarcastic, but collegial. A coworker who likes you.' },
  3: { name: 'Brutal', tone: 'No mercy on the writing, full mercy on the person. Sharp, quotable burns.' },
  4: { name: 'Savage', tone: 'Theatrically merciless. Every weak line gets dragged. Still 100% accurate.' },
  5: { name: 'Scorched Earth', tone: 'Scorched earth. Salt the ground. Maximum heat — but the critique underneath must still be airtight and usable.' },
};

function platformNote(platform) {
  return PLATFORM_NOTES[platform] || PLATFORM_NOTES.linkedin;
}

function severityNote(level) {
  const s = SEVERITY[level] || SEVERITY[3];
  return `Severity dial: ${s.name}. ${s.tone}`;
}

/* ----------------------------- VET ----------------------------- */

const vetSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    riskScore: { type: 'integer', description: '0 = ship it, 100 = career-limiting move' },
    expression: {
      type: 'string',
      enum: ['deadpan', 'skeptical', 'smug', 'gleeful', 'angry'],
      description: 'Heckletons face. Use "angry" only when risk is high.',
    },
    angryMode: { type: 'boolean', description: 'true when riskScore >= 70' },
    verdict: { type: 'string', description: 'One-line roast-summary in Heckletons voice.' },
    critiques: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          line: { type: 'string', description: 'Exact quote from the draft that triggered this.' },
          sensitivity: { type: 'string', description: 'The real risk category this maps to.' },
          severity: { type: 'string', enum: ['low', 'medium', 'high'] },
          roast: { type: 'string', description: 'The mean-but-right critique.' },
          fix: { type: 'string', description: 'A concrete, paste-able fix.' },
        },
        required: ['line', 'sensitivity', 'severity', 'roast', 'fix'],
      },
    },
    fixes: {
      type: 'array',
      description: 'Whole-draft rewrite options for the fixer pane.',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          label: { type: 'string', description: 'e.g. "Safer", "Sharper", "Shorter"' },
          rewrite: { type: 'string', description: 'A full rewritten draft.' },
          note: { type: 'string', description: 'Why this version is better.' },
        },
        required: ['label', 'rewrite', 'note'],
      },
    },
    keepThis: { type: 'string', description: 'The one thing that actually works. Grudging praise.' },
  },
  required: ['riskScore', 'expression', 'angryMode', 'verdict', 'critiques', 'fixes', 'keepThis'],
};

function vetUser({ draft, platform, severity }) {
  return `${platformNote(platform)}
${severityNote(severity)}

Roast and vet this draft. Quote specific lines. Tie every critique to a real sensitivity. Give 2-3 full rewrite options in the fixer (label them like "Safer" / "Sharper" / "Shorter"). Set angryMode true and expression "angry" only if riskScore >= 70.

--- DRAFT ---
${draft}
--- END DRAFT ---`;
}

/* --------------------------- EARNEST --------------------------- */

const earnestSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    take: { type: 'string', description: 'A sincere, warm, honest read of the draft. No roasting.' },
    strengths: { type: 'array', items: { type: 'string' } },
    suggestions: { type: 'array', items: { type: 'string' } },
    riskScore: { type: 'integer' },
  },
  required: ['take', 'strengths', 'suggestions', 'riskScore'],
};

function earnestUser({ draft, platform }) {
  return `Drop the troll act. You are Heckleton's earnest friend now — sincere, kind, still honest. ${platformNote(platform)}

Give a warm, genuinely helpful read of this draft: what's working, what to strengthen, and any real risks to flag (gently). No jokes, no roasting.

--- DRAFT ---
${draft}
--- END DRAFT ---`;
}

/* -------------------------- TRANSLATE -------------------------- */

const translateSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    platform: { type: 'string' },
    translated: { type: 'string', description: 'The draft rewritten natively for the target platform.' },
    changes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          what: { type: 'string' },
          why: { type: 'string' },
        },
        required: ['what', 'why'],
      },
    },
  },
  required: ['platform', 'translated', 'changes'],
};

function translateUser({ draft, from, to }) {
  return `Translate this post from ${from} to ${to}. Keep the core idea, but rewrite tone, length, structure, formatting and hook so it reads as if it was written natively for ${to}. ${platformNote(to)}

Explain the meaningful changes you made.

--- DRAFT (${from}) ---
${draft}
--- END DRAFT ---`;
}

/* ---------------------------- BRIEF ---------------------------- */

const ideaProps = {
  type: 'object',
  additionalProperties: false,
  properties: {
    title: { type: 'string' },
    hook: { type: 'string', description: 'The scroll-stopping first line.' },
    whyNow: { type: 'string', description: 'The why-now / timeliness angle.' },
    framework: { type: 'string', description: 'The structure/format to use.' },
    starterDraft: { type: 'string', description: 'A short ready-to-edit starter draft.' },
    platform: { type: 'string', enum: ['linkedin', 'beehiiv', 'substack'] },
  },
  required: ['title', 'hook', 'whyNow', 'framework', 'starterDraft', 'platform'],
};

const briefSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    greeting: { type: 'string', description: 'Heckleton delivering the brief, in voice. One or two lines.' },
    headline: ideaProps,
    backups: { type: 'array', items: ideaProps },
  },
  required: ['greeting', 'headline', 'backups'],
};

function briefUser({ date, context }) {
  return `It is ${date}. Deliver Heckleton's Brief for an enablement / go-to-market thought leader who posts mostly on LinkedIn (and sometimes beehiiv/substack).

Give ONE headline post idea plus TWO backups. Each idea needs: a title, a hook (first line), a why-now angle, a framework (structure), and a short starter draft they can click "Draft this" on. Keep starter drafts tight (120-180 words). Be opinionated. Open with a short in-voice greeting (you may be grumpy about mornings).

${context ? `Context to mine for ideas (winners, ingested notes, current news):\n${context}` : 'No extra context provided — use evergreen enablement themes with a timely spin.'}`;
}

/* --------------------------- WINNERS --------------------------- */

const winnersSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    summary: { type: 'string', description: 'In-voice read on what works for this author.' },
    topics: { type: 'array', items: { type: 'string' } },
    frameworks: { type: 'array', items: { type: 'string' } },
    hookStyles: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'topics', 'frameworks', 'hookStyles'],
};

function winnersUser({ posts }) {
  return `Here are the author's top-performing posts. Distill what actually works for THEM: the recurring topics, the post frameworks/structures, and the hook styles. Be specific and pattern-match — this becomes the playbook the Brief draws from.

--- WINNING POSTS ---
${posts}
--- END ---`;
}

/* ---------------------------- DRIVE ---------------------------- */

const driveSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    sourceTitle: { type: 'string' },
    notes: { type: 'string', description: 'In-voice read on the source material.' },
    ideas: { type: 'array', items: ideaProps },
  },
  required: ['sourceTitle', 'notes', 'ideas'],
};

function driveUser({ title, content }) {
  return `This is the full text of an ingested working doc (toggles/sections flattened). Mine it for tomorrow's post idea(s) — pull the most postable insight, story, or contrarian take buried in here. Give 1-3 ideas in the standard shape (title, hook, why-now, framework, starter draft, platform).

--- SOURCE: ${title} ---
${content}
--- END SOURCE ---`;
}

/* ----------------------------- NEWS ---------------------------- */
/* News uses the web_search server tool, so we parse JSON leniently instead
   of using structured outputs (which doesn't compose cleanly with tools). */

function newsUser({ draft }) {
  const draftBlock = draft && draft.trim()
    ? `\n\nThe author is about to post this draft. Flag specifically whether it could land poorly given the current cycle:\n--- DRAFT ---\n${draft}\n--- END DRAFT ---`
    : '';
  return `Search the web for what is happening RIGHT NOW in startups, tech, and sales/GTM enablement (last few days). Find real, current events.

Return ONLY a JSON object (no prose around it) shaped exactly like:
{
  "items": [
    { "headline": "string", "area": "startups|tech|enablement", "why": "why a poster should care", "risk": "what post could land badly right now" }
  ],
  "guidance": "one-line in-voice steer from Heckleton on what's safe vs spicy to post into today"
}
Give 4-6 items.${draftBlock}`;
}

module.exports = {
  PERSONA,
  vetSchema, vetUser,
  earnestSchema, earnestUser,
  translateSchema, translateUser,
  briefSchema, briefUser,
  winnersSchema, winnersUser,
  driveSchema, driveUser,
  newsUser,
};
