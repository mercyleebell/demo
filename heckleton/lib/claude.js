'use strict';

const Anthropic = require('@anthropic-ai/sdk');
const { PERSONA } = require('./prompts');

const MODEL = process.env.HECKLETON_MODEL || 'claude-opus-4-8';
const hasKey = Boolean(process.env.ANTHROPIC_API_KEY);
const client = hasKey ? new Anthropic() : null;

const live = () => Boolean(client);

/**
 * One structured call to Claude. Returns the parsed object, or throws.
 * Adaptive thinking on; structured outputs constrain the reply to `schema`.
 */
async function structured({ system, user, schema, maxTokens = 8000 }) {
  const resp = await client.messages.create({
    model: MODEL,
    max_tokens: maxTokens,
    thinking: { type: 'adaptive' },
    system: system || PERSONA,
    output_config: { format: { type: 'json_schema', schema } },
    messages: [{ role: 'user', content: user }],
  });
  const text = resp.content.find((b) => b.type === 'text');
  if (!text) throw new Error('No text block in response');
  return JSON.parse(text.text);
}

/**
 * News layer: lets Claude search the live web, then parse the JSON it returns.
 * Runs the agentic loop, resuming on pause_turn (server-tool iteration cap).
 */
async function withWebSearch({ system, user, maxTokens = 6000 }) {
  const tools = [{ type: 'web_search_20260209', name: 'web_search' }];
  let messages = [{ role: 'user', content: user }];
  let resp;
  for (let i = 0; i < 6; i++) {
    resp = await client.messages.create({
      model: MODEL,
      max_tokens: maxTokens,
      thinking: { type: 'adaptive' },
      system: system || PERSONA,
      tools,
      messages,
    });
    if (resp.stop_reason === 'pause_turn') {
      messages = [{ role: 'user', content: user }, { role: 'assistant', content: resp.content }];
      continue;
    }
    break;
  }
  const text = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  return extractJson(text);
}

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON found in response');
  return JSON.parse(text.slice(start, end + 1));
}

module.exports = { client, live, MODEL, structured, withWebSearch, hasKey };
