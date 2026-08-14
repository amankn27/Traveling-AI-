'use client';

import { CHAPTERS, DESTINATIONS, SECTIONS, type Climate, type SectionId } from '@/lib/site-data';
import type { Plan, PlanStep, ToolArgs, ToolName } from '@/types/agent';
import { markModelAvailable, markModelUnavailable, modelUnavailable } from './model-route';
import { isSectionId, isTargetKey } from './registry';

let counter = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(counter++).toString(36)}`;

function step(title: string, tool: ToolName, args: ToolArgs): PlanStep {
  return { id: uid('step'), title, tool, args, status: 'pending' };
}

function makePlan(goal: string, steps: PlanStep[]): Plan {
  return { id: uid('plan'), goal, steps, revision: 0 };
}

const EMAIL_RE = /[\w.+-]+@[\w-]+\.[\w.]{2,}/;

const AFFIRMATIVE = /^(y|yes|yeah|yep|sure|ok|okay|go ahead|do it|please do|confirm|confirmed)\b/i;
const NEGATIVE = /^(n|no|nope|cancel|stop|never mind|nevermind)\b/i;

const MOVE_VERBS =
  /\b(show|take|bring|go|goto|jump|scroll|navigate|move|open|see|view|visit|find|where)\b/i;

const EXPLAIN_VERBS = /\b(what|who|why|how|tell|explain|describe|about|says?|means?)\b/i;

const MONTHS = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

const ALL_TAGS = Array.from(new Set(DESTINATIONS.flatMap((d) => d.tags)));
const ALL_REGIONS = Array.from(new Set(DESTINATIONS.map((d) => d.region)));

/** Regions holding exactly one journey — safe to treat as naming that journey. */
const UNIQUE_REGIONS = new Set(
  ALL_REGIONS.filter(
    (r) => DESTINATIONS.filter((d) => d.region === r).length === 1,
  ).map((r) => r.toLowerCase()),
);

/* -------------------------------------------------------------------------- */
/*  Reference resolution                                                      */
/* -------------------------------------------------------------------------- */

const PRONOUN_RE = /\b(it|its|that|this|there|the same|that one|the one)\b/i;
const ORDINALS: Record<string, number> = {
  first: 0, '1st': 0, one: 0,
  second: 1, '2nd': 1, two: 1,
  third: 2, '3rd': 2, three: 2,
  fourth: 3, '4th': 3, four: 3,
  last: DESTINATIONS.length - 1,
};

export interface ResolvedReference {
  /** Destination the utterance is really about, if any. */
  slug?: string;
  section?: SectionId;
  /** True when we had to reach into memory to work it out. */
  viaMemory: boolean;
}

/**
 * Works out what "it" / "that one" / "the second one" refers to.
 *
 * An explicit mention always wins; otherwise a pronoun falls back to the most
 * recently discussed entity, then to the section the reader was last taken to.
 */
export function resolveReference(
  text: string,
  entities: string[],
  lastSection: SectionId | null,
): ResolvedReference {
  const lower = text.toLowerCase();

  // A region only identifies a journey when it holds exactly one — "India"
  // covers four, so it's a search, not a reference to one place.
  const named = DESTINATIONS.find(
    (d) =>
      lower.includes(d.name.toLowerCase()) ||
      lower.includes(d.slug) ||
      (UNIQUE_REGIONS.has(d.region.toLowerCase()) && lower.includes(d.region.toLowerCase())),
  );
  if (named) return { slug: named.slug, viaMemory: false };

  // "the second one", "the last one"
  const ordinalMatch = /\b(first|second|third|fourth|last|1st|2nd|3rd|4th)\b\s*(one|journey|trip)?/.exec(lower);
  if (ordinalMatch?.[1]) {
    const idx = ORDINALS[ordinalMatch[1]];
    const target = typeof idx === 'number' ? DESTINATIONS[idx] : undefined;
    if (target) return { slug: target.slug, viaMemory: false };
  }

  if (PRONOUN_RE.test(lower)) {
    const remembered = entities.find((e) => DESTINATIONS.some((d) => d.slug === e));
    if (remembered) return { slug: remembered, viaMemory: true };
    if (lastSection) return { section: lastSection, viaMemory: true };
  }

  return { viaMemory: false };
}

/* -------------------------------------------------------------------------- */
/*  Attribute extraction                                                      */
/* -------------------------------------------------------------------------- */

type Criteria = NonNullable<import('@/types/agent').ToolArgsMap['filterDestinations']>;

/** Pulls climate / length / month / theme constraints out of free text. */
export function extractCriteria(text: string): Criteria | null {
  const lower = text.toLowerCase();
  const criteria: Criteria = {};

  const region = ALL_REGIONS.find((r) => lower.includes(r.toLowerCase()));
  if (region) criteria.region = region;

  let climate: Climate | undefined;
  if (/\b(cold|cool|chilly|freezing|snow|snowy|ice|icy|glacier|arctic|winter)\b/.test(lower)) climate = 'cold';
  else if (/\b(warm|hot|sun|sunny|heat|desert|tropical)\b/.test(lower)) climate = 'warm';
  else if (/\b(mild|temperate)\b/.test(lower)) climate = 'temperate';
  if (climate) criteria.climate = climate;

  const under = /\b(?:under|less than|fewer than|below)\s+(\d+)\s*(?:nights?|days?)?/.exec(lower);
  if (under?.[1]) criteria.maxNights = Number(under[1]) - 1;

  const over = /\b(?:over|more than|longer than|at least|above)\s+(\d+)\s*(?:nights?|days?)?/.exec(lower);
  if (over?.[1]) criteria.minNights = Number(over[1]) + (/at least/.test(lower) ? 0 : 1);

  const exact = /\b(\d+)\s*nights?\s*(?:or (fewer|less))\b/.exec(lower);
  if (exact?.[1]) criteria.maxNights = Number(exact[1]);

  if (criteria.maxNights === undefined && criteria.minNights === undefined) {
    if (/\b(short|shorter|quick|brief)\b/.test(lower)) criteria.maxNights = 8;
    else if (/\b(long|longer|extended)\b/.test(lower)) criteria.minNights = 10;
  }

  const month = MONTHS.find((m) => {
    if (!new RegExp(`\\b${m}\\b`).test(lower)) return false;
    // "may" is a verb far more often than a month — require a date preposition.
    if (m === 'may') return /\b(in|during|for|around|by)\s+may\b/.test(lower);
    return true;
  });
  if (month) criteria.month = month;

  const tag = ALL_TAGS.find((t) => new RegExp(`\\b${t}\\b`).test(lower));
  if (tag) criteria.tag = tag;

  if (/\b(shortest|quickest|briefest)\b/.test(lower)) criteria.extreme = 'shortest';
  else if (/\b(longest)\b/.test(lower)) criteria.extreme = 'longest';

  return Object.keys(criteria).length ? criteria : null;
}

/* -------------------------------------------------------------------------- */
/*  Section matching                                                          */
/* -------------------------------------------------------------------------- */

function matchSection(text: string): SectionId | null {
  const words = text.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  let best: { id: SectionId; score: number } | null = null;

  for (const section of SECTIONS) {
    let score = 0;
    for (const keyword of section.keywords) {
      if (words.includes(keyword)) score += 3;
      else if (text.includes(keyword)) score += 2;
    }
    if (text.includes(section.label.toLowerCase())) score += 4;
    if (score > 0 && (!best || score > best.score)) best = { id: section.id, score };
  }
  return best?.id ?? null;
}

function matchChapter(text: string) {
  const lower = text.toLowerCase();
  const byTitle = CHAPTERS.find((c) => lower.includes(c.title.toLowerCase().slice(0, 18)));
  if (byTitle) return byTitle;
  if (/\bchapter\s*(one|1|i)\b/.test(lower)) return CHAPTERS[0];
  if (/\bchapter\s*(two|2|ii)\b/.test(lower)) return CHAPTERS[1];
  if (/\bchapter\s*(three|3|iii)\b/.test(lower)) return CHAPTERS[2];
  return CHAPTERS.find((c) => lower.includes(c.category.toLowerCase()));
}

/* -------------------------------------------------------------------------- */
/*  Canned prose (only where there's genuinely nothing to look up)            */
/* -------------------------------------------------------------------------- */

const HELP_TEXT = [
  'I’m the studio concierge. I can actually operate this page for you, not just talk about it.',
  '',
  'Try: “show me the destinations”, “which journey is shortest?”, “somewhere cold under 8 nights”,',
  '“what’s similar to Kyoto?”, “compare Kyoto and Marrakech”, or “sign me up for the letter”.',
].join('\n');

const GREETING =
  'Good to see you. I can move you around the page, pull up a journey, or find one that fits what you’re after. Where would you like to begin?';

const FALLBACK = [
  'I didn’t catch a section or a journey in that.',
  '',
  `I can take you to the philosophy, the ${DESTINATIONS.length} curated journeys, the curator’s note, the journal, the Quiet Letter, or the studio’s contact details — and I can filter by region, season, length or character (“somewhere warm in India, under a week”).`,
].join('\n');

/* -------------------------------------------------------------------------- */
/*  Planner                                                                   */
/* -------------------------------------------------------------------------- */

export interface PlannerInput {
  text: string;
  lastSection: SectionId | null;
  entities: string[];
  pending: { tool: ToolName; args: ToolArgs; prompt: string } | null;
}

export function planLocally({ text, lastSection, entities, pending }: PlannerInput): Plan {
  const raw = text.trim();
  const lower = raw.toLowerCase();
  const reference = resolveReference(raw, entities, lastSection);

  /* — 0. Resolve an outstanding confirmation first --------------------- */
  if (pending) {
    if (AFFIRMATIVE.test(lower)) {
      const args = { ...(pending.args as Record<string, unknown>), confirmed: true } as ToolArgs;
      return makePlan('Carry out the confirmed action', [
        step('Carry out the confirmed action', pending.tool, args),
        step('Confirm back', 'respond', {
          text: 'Done — your address is in the form. Press Subscribe whenever you’re ready.',
        }),
      ]);
    }
    if (NEGATIVE.test(lower)) {
      return makePlan('Cancel the pending action', [
        step('Acknowledge the cancellation', 'respond', { text: 'Of course — I’ve left it alone.' }),
      ]);
    }
  }

  /* — 1. Greetings and capability questions ---------------------------- */
  if (/^(hi|hello|hey|yo|bonjour|salut|good (morning|evening|afternoon))\b/i.test(lower)) {
    return makePlan('Greet the reader', [step('Greet', 'respond', { text: GREETING })]);
  }
  if (/\b(help|what can you do|capabilit|commands?|how do you work|who are you)\b/i.test(lower)) {
    return makePlan('Explain what I can do', [step('Explain', 'respond', { text: HELP_TEXT })]);
  }

  /* — 2. Back to top --------------------------------------------------- */
  if (/\b(top|beginning|start over|back up)\b/.test(lower) && MOVE_VERBS.test(lower)) {
    return makePlan('Return to the top of the page', [
      step('Scroll to the opening scene', 'scrollToSection', { sectionId: 'hero' }),
      step('Confirm', 'respond', { text: 'Back at the top.' }),
    ]);
  }

  /* — 3. Explore mode -------------------------------------------------- */
  if (/\b(explore mode|3d|three-d|enter the scene|particles|splat|drag the scene)\b/.test(lower)) {
    const leaving = /\b(exit|leave|stop|close|off)\b/.test(lower);
    return makePlan(leaving ? 'Leave explore mode' : 'Enter the 3D scene', [
      step('Return to the opening scene', 'scrollToSection', { sectionId: 'hero' }),
      step(leaving ? 'Leave explore mode' : 'Enter explore mode', 'enterExploreMode', {
        active: !leaving,
      }),
      step('Confirm', 'respond', {
        text: leaving
          ? 'We’re back in browse mode — the page scrolls normally again.'
          : 'Explore mode is live. Drag anywhere in the scene to move through the light; press Space or hit Exit to come back.',
      }),
    ]);
  }

  /* — 4. Newsletter ---------------------------------------------------- */
  const email = raw.match(EMAIL_RE)?.[0];
  if (email || /\b(subscribe|sign me up|sign up|join the letter|newsletter)\b/.test(lower)) {
    if (email) {
      return makePlan('Prepare the newsletter subscription', [
        step('Bring the Quiet Letter into view', 'scrollToSection', { sectionId: 'newsletter' }),
        step('Highlight the form', 'highlightElement', { target: 'newsletter-form' }),
        step('Stage the address', 'subscribeNewsletter', { email, confirmed: false }),
        step('Ask for confirmation', 'respond', {
          text: `I can drop ${email} into the Quiet Letter form for you — shall I? I won’t submit it; you’ll press Subscribe yourself.`,
        }),
      ]);
    }
    return makePlan('Show the newsletter', [
      step('Bring the Quiet Letter into view', 'scrollToSection', { sectionId: 'newsletter' }),
      step('Highlight the form', 'highlightElement', { target: 'newsletter-form' }),
      step('Explain', 'respond', {
        text: 'Here’s the Quiet Letter — it arrives twice a season. Give me your address and I’ll fill the field in for you.',
      }),
    ]);
  }

  /* — 5. Theme --------------------------------------------------------- */
  if (/\b(dark mode|light mode|dark theme|light theme|switch the theme|toggle theme)\b/.test(lower)) {
    const theme = /\bdark\b/.test(lower) ? 'dark' : /\blight\b/.test(lower) ? 'light' : 'toggle';
    return makePlan('Change the palette', [
      step(`Set the ${theme} palette`, 'setTheme', { theme }),
      step('Confirm', 'respond', {
        text: 'Done — the assistant surface follows the palette you picked.',
      }),
    ]);
  }

  /* — 6. Compare ------------------------------------------------------- */
  const mentioned = DESTINATIONS.filter(
    (d) => lower.includes(d.name.toLowerCase()) || lower.includes(d.slug),
  );
  const wantsCompare = /\b(compare|versus|vs\.?|difference between)\b/.test(lower);

  if (wantsCompare || mentioned.length >= 2) {
    const slugs: string[] = [];
    const add = (slug?: string) => {
      if (slug && !slugs.includes(slug)) slugs.push(slug);
    };

    if (/\ball\b/.test(lower)) DESTINATIONS.forEach((d) => add(d.slug));
    mentioned.forEach((d) => add(d.slug));

    // "compare it with Kyoto" — the other side is the most recent thing we
    // discussed. Take one, not the whole of memory: after a few turns every
    // journey is remembered, and pulling them all in compares the entire atlas.
    if (slugs.length < 2) {
      const recent = entities.find(
        (e) => !slugs.includes(e) && DESTINATIONS.some((d) => d.slug === e),
      );
      add(recent);
    }

    if (slugs.length >= 2) {
      const picked = slugs.slice(0, 4);
      const names = picked.map((s) => DESTINATIONS.find((d) => d.slug === s)?.name ?? s);
      return makePlan('Compare journeys', [
        step(`Compare ${names.join(' and ')}`, 'compareDestinations', { slugs: picked }),
        step('Bring the journeys into view', 'scrollToSection', { sectionId: 'destinations' }),
      ]);
    }
    // Not enough to compare — fall through and treat it as an ordinary query.
  }

  /* — 7. Similar to ---------------------------------------------------- */
  if (/\b(similar|like|closest|same sort|something else like|alternative)\b/.test(lower) && reference.slug) {
    const seed = DESTINATIONS.find((d) => d.slug === reference.slug);
    return makePlan('Find a similar journey', [
      step(`Find something like ${seed?.name ?? reference.slug}`, 'similarDestinations', {
        slug: reference.slug,
      }),
      step('Bring the journeys into view', 'scrollToSection', { sectionId: 'destinations' }),
    ]);
  }

  /* — 8. Attribute-driven search --------------------------------------- */
  const criteria = extractCriteria(lower);
  const looksLikeSearch =
    criteria &&
    (/\b(journey|journeys|trip|trips|destination|destinations|somewhere|anywhere|which|what|recommend|suggest|looking for|want|show|in)\b/.test(lower) ||
      Boolean(criteria.extreme) ||
      // "India" alone covers several journeys — always a search.
      Boolean(criteria.region));

  if (looksLikeSearch && criteria) {
    return makePlan('Find journeys that fit', [
      step('Search the atlas', 'filterDestinations', criteria),
      step('Bring the journeys into view', 'scrollToSection', { sectionId: 'destinations' }),
    ]);
  }

  /* — 9. A specific journey (explicit, ordinal, or via memory) ---------- */
  if (reference.slug) {
    const destination = DESTINATIONS.find((d) => d.slug === reference.slug);
    if (destination) {
      return makePlan(`Tell the reader about ${destination.name}`, [
        step(`Look up ${destination.name}`, 'describeDestination', { slug: destination.slug }),
        step('Bring the journeys into view', 'scrollToSection', { sectionId: 'destinations' }),
        step(`Highlight the ${destination.name} card`, 'highlightElement', {
          target: `destination-${destination.slug}`,
        }),
      ]);
    }
  }

  /* — 10. A specific chapter -------------------------------------------- */
  const chapter = matchChapter(lower);
  if (chapter && /\b(chapter|journal|story|stories|read|article)\b/.test(lower)) {
    return makePlan(`Open ${chapter.ordinal}`, [
      step('Bring the journal into view', 'scrollToSection', { sectionId: 'journal' }),
      step(`Highlight ${chapter.ordinal}`, 'highlightElement', { target: `chapter-${chapter.id}` }),
      step('Introduce the chapter', 'respond', {
        text: `${chapter.ordinal} — “${chapter.title}”, filed under ${chapter.category}. ${chapter.excerpt} By ${chapter.author}, ${chapter.readTime} minutes.`,
      }),
    ]);
  }

  /* — 11. List the journeys --------------------------------------------- */
  if (
    /\b(destinations?|journeys?|trips?|places?|atlas)\b/.test(lower) &&
    /\b(list|all|what|which|how many|options)\b/.test(lower)
  ) {
    return makePlan('List the curated journeys', [
      step('Gather the journeys', 'listDestinations', {}),
      step('Bring the journeys into view', 'scrollToSection', { sectionId: 'destinations' }),
    ]);
  }

  /* — 12. Section by name ----------------------------------------------- */
  const sectionId = matchSection(lower) ?? (reference.section ?? null);
  if (sectionId) {
    const meta = SECTIONS.find((s) => s.id === sectionId);
    const explaining = EXPLAIN_VERBS.test(lower) && !MOVE_VERBS.test(lower);

    const steps: PlanStep[] = [step(`Read “${meta?.label}”`, 'readSection', { sectionId })];
    if (!explaining) {
      steps.push(step(`Scroll to ${meta?.label}`, 'scrollToSection', { sectionId }));
      if (isTargetKey(sectionId)) {
        steps.push(step('Highlight it', 'highlightElement', { target: sectionId, durationMs: 2200 }));
      }
    }
    return makePlan(`Show the ${meta?.label} section`, steps);
  }

  /* — 13. Contextual follow-up ------------------------------------------ */
  if (/\b(more|again|next|continue|keep going)\b/.test(lower) && lastSection) {
    const idx = SECTIONS.findIndex((s) => s.id === lastSection);
    const next = SECTIONS[Math.min(idx + 1, SECTIONS.length - 1)];
    if (next) {
      return makePlan('Continue down the page', [
        step(`Read “${next.label}”`, 'readSection', { sectionId: next.id }),
        step(`Scroll to ${next.label}`, 'scrollToSection', { sectionId: next.id }),
      ]);
    }
  }

  /* — 14. Fallback ------------------------------------------------------ */
  return makePlan('Answer without moving the page', [
    step('Answer', 'respond', { text: FALLBACK }),
  ]);
}

/* -------------------------------------------------------------------------- */
/*  Model-backed planner (optional)                                           */
/* -------------------------------------------------------------------------- */

interface RemoteStep {
  title?: unknown;
  tool?: unknown;
  args?: unknown;
}

const VALID_TOOLS: ReadonlySet<string> = new Set<ToolName>([
  'scrollToSection',
  'highlightElement',
  'navigate',
  'openPanel',
  'closePanel',
  'setTheme',
  'triggerAnimation',
  'readSection',
  'listDestinations',
  'describeDestination',
  'filterDestinations',
  'compareDestinations',
  'similarDestinations',
  'enterExploreMode',
  'subscribeNewsletter',
  'respond',
]);

/**
 * Validates a model-authored plan against the same allow-lists the local planner
 * obeys. Anything unrecognised is dropped rather than trusted.
 */
export function sanitiseRemotePlan(goal: string, steps: unknown): Plan | null {
  if (!Array.isArray(steps)) return null;
  const safe: PlanStep[] = [];

  for (const s of steps.slice(0, 6) as RemoteStep[]) {
    const tool = typeof s.tool === 'string' ? s.tool : '';
    if (!VALID_TOOLS.has(tool)) continue;

    const args = (s.args ?? {}) as Record<string, unknown>;

    if (tool === 'scrollToSection' || tool === 'readSection') {
      if (!isSectionId(String(args.sectionId ?? ''))) continue;
    }
    if (tool === 'highlightElement' && !isTargetKey(String(args.target ?? ''))) continue;
    if (tool === 'subscribeNewsletter') {
      // The model is never allowed to pre-confirm an outbound action.
      args.confirmed = false;
    }

    safe.push({
      id: uid('step'),
      title: typeof s.title === 'string' && s.title ? s.title : tool,
      tool: tool as ToolName,
      args: args as ToolArgs,
      status: 'pending',
    });
  }

  if (!safe.length) return null;
  return makePlan(goal || 'Assist the reader', safe);
}

export async function planWithModel(
  input: PlannerInput,
  context: string,
  signal: AbortSignal,
): Promise<Plan | null> {
  if (modelUnavailable()) return null;

  try {
    const res = await fetch('/api/agent/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input.text, context }),
      signal,
    });

    if (res.status === 503) {
      markModelUnavailable();
      return null;
    }
    if (!res.ok) return null;
    markModelAvailable();
    const json: unknown = await res.json();
    if (typeof json !== 'object' || json === null) return null;
    const { goal, steps } = json as { goal?: unknown; steps?: unknown };
    return sanitiseRemotePlan(typeof goal === 'string' ? goal : '', steps);
  } catch {
    return null;
  }
}

export { makePlan, step };
