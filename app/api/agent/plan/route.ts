import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { DESTINATIONS, SECTIONS } from '@/lib/site-data';
import { TARGET_KEYS } from '@/lib/agent/registry';
import { clientKey, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const LIMIT = 20;
const WINDOW_MS = 60_000;

/**
 * Optional model-backed planner.
 *
 * Without `ANTHROPIC_API_KEY` this returns 503 and the client silently falls back
 * to the deterministic local planner — the assistant is fully functional either
 * way. With a key, Claude authors the plan and the client re-validates every
 * step against the same allow-lists before anything touches the page.
 */

const TOOL_GUIDE = `
- scrollToSection { sectionId }      bring a section into view
- highlightElement { target }        draw a gold beacon around a registered element
- readSection { sectionId }          look up what a section is about
- listDestinations { }               list all curated journeys
- describeDestination { slug }       full detail on one journey
- filterDestinations { climate?, maxNights?, minNights?, month?, tag?, extreme? }
                                     search the atlas; extreme is "shortest" | "longest"
- compareDestinations { slugs }      put two or more journeys side by side
- similarDestinations { slug }       find the journey closest in character
- enterExploreMode { active }        enter/leave the hero's interactive 3D scene
- setTheme { theme }                 "light" | "dark" | "toggle"
- triggerAnimation { name }          "kenBurns" | "shimmer" | "chapterReveal" | "statCount"
- subscribeNewsletter { email }      fill (never submit) the Quiet Letter form
- navigate { href }                  move to another page
- respond { text }                   speak to the reader — ALWAYS the final step
`.trim();

const SYSTEM = `You are the concierge for Veloria, a boutique travel studio's single-page site.
You do not just answer — you operate the page on the reader's behalf.

Return a plan: an ordered list of at most 5 tool calls ending with exactly one "respond" step.

Sections (use these exact ids):
${SECTIONS.map((s) => `- ${s.id} — ${s.label}: ${s.synopsis}`).join('\n')}

Journeys (use these exact slugs):
${DESTINATIONS.map((d) => `- ${d.slug} — ${d.name}, ${d.region}, ${d.nights} nights, ${d.season}. ${d.blurb}`).join('\n')}

Highlight targets: ${TARGET_KEYS.join(', ')}

Tools:
${TOOL_GUIDE}

Important: when the plan gathers information (filter, compare, similar, describe, list, read),
do NOT add a "respond" step — the reply is written afterwards from the real results.
Only use "respond" for greetings, capability questions, confirmations, or when no lookup happened.

Never invent journeys, prices, or dates that aren't listed above.
Never set "confirmed" on subscribeNewsletter; ask the reader first.`;

const PLAN_SCHEMA = {
  type: 'object',
  properties: {
    goal: {
      type: 'string',
      description: 'One short line naming what this plan achieves.',
    },
    steps: {
      type: 'array',
      description: 'Ordered tool calls. Max 5. The last one must be "respond".',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Human-readable label for the trace UI.' },
          tool: {
            type: 'string',
            enum: [
              'scrollToSection',
              'highlightElement',
              'readSection',
              'listDestinations',
              'describeDestination',
              'filterDestinations',
              'compareDestinations',
              'similarDestinations',
              'enterExploreMode',
              'setTheme',
              'triggerAnimation',
              'subscribeNewsletter',
              'navigate',
              'respond',
            ],
          },
          args: {
            type: 'object',
            description: 'Arguments for the tool. Only include keys the tool takes.',
            properties: {
              sectionId: { type: 'string' },
              target: { type: 'string' },
              slug: { type: 'string' },
              slugs: { type: 'array', items: { type: 'string' } },
              climate: { type: 'string', enum: ['cold', 'temperate', 'warm'] },
              maxNights: { type: 'integer' },
              minNights: { type: 'integer' },
              month: { type: 'string' },
              tag: { type: 'string' },
              extreme: { type: 'string', enum: ['shortest', 'longest'] },
              href: { type: 'string' },
              theme: { type: 'string' },
              name: { type: 'string' },
              email: { type: 'string' },
              active: { type: 'boolean' },
              text: { type: 'string' },
            },
            required: [],
            additionalProperties: false,
          },
        },
        required: ['title', 'tool', 'args'],
        additionalProperties: false,
      },
    },
  },
  required: ['goal', 'steps'],
  additionalProperties: false,
} as const;

interface PlanRequest {
  message?: unknown;
  context?: unknown;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'planner_unavailable' }, { status: 503 });
  }

  const limit = rateLimit(`plan:${clientKey(request)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: rateLimitHeaders(limit, LIMIT) },
    );
  }

  let body: PlanRequest;
  try {
    body = (await request.json()) as PlanRequest;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.slice(0, 2000) : '';
  const context = typeof body.context === 'string' ? body.context.slice(0, 4000) : '';
  if (!message.trim()) {
    return NextResponse.json({ error: 'empty_message' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.messages.create({
      model: 'claude-opus-5',
      max_tokens: 2048,
      system: SYSTEM,
      // A concierge turn is a short routing decision — low effort keeps it snappy
      // while adaptive thinking stays on (the recommended pairing on Opus 5).
      output_config: {
        effort: 'low',
        format: { type: 'json_schema', schema: PLAN_SCHEMA },
      },
      messages: [
        {
          role: 'user',
          content: context ? `${context}\n\n---\n\nReader says: ${message}` : `Reader says: ${message}`,
        },
      ],
    });

    if (response.stop_reason === 'refusal') {
      return NextResponse.json({ error: 'refused' }, { status: 422 });
    }

    const textBlock = response.content.find(
      (block): block is Anthropic.TextBlock => block.type === 'text',
    );
    if (!textBlock) {
      return NextResponse.json({ error: 'empty_plan' }, { status: 502 });
    }

    return NextResponse.json(JSON.parse(textBlock.text) as unknown, {
      headers: rateLimitHeaders(limit, LIMIT),
    });
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status : undefined;
    console.error('[agent/plan]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'planner_failed' }, { status: status ?? 502 });
  }
}
