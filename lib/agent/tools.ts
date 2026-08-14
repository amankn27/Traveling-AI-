'use client';

import { DESTINATIONS, findSection, SECTIONS, type Destination } from '@/lib/site-data';
import { useUiStore } from '@/store/ui-store';
import type {
  ToolArgsMap,
  ToolContext,
  ToolDefinition,
  ToolName,
  ToolResult,
} from '@/types/agent';
import { isAllowedRoute, isSectionId, resolveTarget } from './registry';

const ok = (summary: string, data?: unknown): ToolResult => ({ ok: true, summary, data });
const fail = (error: string): ToolResult => ({ ok: false, summary: error, error });

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Resolves once the window has stopped scrolling, or after a hard timeout. */
function waitForScrollEnd(signal: AbortSignal, timeout = 1400): Promise<void> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve();

    let settleTimer = 0;
    const cleanup = () => {
      window.removeEventListener('scroll', onScroll);
      signal.removeEventListener('abort', onAbort);
      window.clearTimeout(settleTimer);
      window.clearTimeout(hardStop);
    };
    const finish = () => {
      cleanup();
      resolve();
    };
    const onScroll = () => {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(finish, 130);
    };
    const onAbort = () => finish();

    const hardStop = window.setTimeout(finish, timeout);
    settleTimer = window.setTimeout(finish, 320);
    window.addEventListener('scroll', onScroll, { passive: true });
    signal.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * The reference centres a section in the viewport rather than pinning it to the
 * top — matching that keeps agent navigation visually identical to clicking a
 * nav link.
 */
function scrollSectionIntoView(el: HTMLElement) {
  const rect = el.getBoundingClientRect();
  const centred = rect.top + window.scrollY - (window.innerHeight - rect.height) / 2;
  const max = document.documentElement.scrollHeight - window.innerHeight;
  const top = Math.max(0, Math.min(centred, max));
  window.scrollTo({ top, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
}

/* -------------------------------------------------------------------------- */
/*  Tool implementations                                                      */
/* -------------------------------------------------------------------------- */

const scrollToSection: ToolDefinition<'scrollToSection'> = {
  name: 'scrollToSection',
  description: 'Smoothly bring a named section of the page into view.',
  async run({ sectionId }, ctx) {
    if (!isSectionId(sectionId)) return fail(`“${sectionId}” is not a section on this page.`);
    if (ctx.pathname !== '/') {
      ctx.navigate('/');
      await new Promise((r) => setTimeout(r, 420));
    }
    const el = document.getElementById(sectionId);
    if (!el) return fail(`The ${sectionId} section isn’t mounted yet.`);

    scrollSectionIntoView(el);
    await waitForScrollEnd(ctx.signal);

    const meta = findSection(sectionId);
    return ok(`Moved to “${meta?.label ?? sectionId}”.`, { sectionId });
  },
};

const highlightElement: ToolDefinition<'highlightElement'> = {
  name: 'highlightElement',
  description: 'Draw a soft gold beacon around a registered element so the user can spot it.',
  async run({ target, durationMs = 2600 }, ctx) {
    const el = resolveTarget(target);
    if (!el) return fail(`Nothing registered under “${target}”.`);

    el.setAttribute('data-agent-highlight', 'true');
    await new Promise<void>((resolve) => {
      const t = window.setTimeout(resolve, durationMs);
      ctx.signal.addEventListener(
        'abort',
        () => {
          window.clearTimeout(t);
          resolve();
        },
        { once: true },
      );
    });
    el.removeAttribute('data-agent-highlight');

    return ok(`Highlighted ${target}.`, { target });
  },
};

const navigate: ToolDefinition<'navigate'> = {
  name: 'navigate',
  description: 'Move to another page of the site.',
  async run({ href }, ctx) {
    if (!isAllowedRoute(href)) return fail(`“${href}” is outside this site.`);
    if (ctx.pathname === href) return ok(`Already on ${href}.`, { href });
    ctx.navigate(href);
    await new Promise((r) => setTimeout(r, 380));
    return ok(`Opened ${href}.`, { href });
  },
};

const openPanel: ToolDefinition<'openPanel'> = {
  name: 'openPanel',
  description: 'Open the mobile menu.',
  async run({ panel }) {
    if (panel === 'menu') useUiStore.getState().setMobileMenuOpen(true);
    return ok(`Opened the ${panel} panel.`);
  },
};

const closePanel: ToolDefinition<'closePanel'> = {
  name: 'closePanel',
  description: 'Close the mobile menu.',
  async run({ panel }) {
    if (panel === 'menu') useUiStore.getState().setMobileMenuOpen(false);
    return ok(`Closed the ${panel} panel.`);
  },
};

const setTheme: ToolDefinition<'setTheme'> = {
  name: 'setTheme',
  description: 'Switch the assistant surface between the light and dark palettes.',
  async run({ theme }) {
    const store = useUiStore.getState();
    if (theme === 'toggle') store.toggleTheme();
    else store.setTheme(theme);
    return ok(`Palette set to ${useUiStore.getState().theme}.`);
  },
};

const triggerAnimation: ToolDefinition<'triggerAnimation'> = {
  name: 'triggerAnimation',
  description: 'Replay one of the page’s signature animations.',
  async run({ name }) {
    useUiStore.getState().bumpAnimation(name);
    await new Promise((r) => setTimeout(r, 200));
    return ok(`Replayed the ${name} animation.`);
  },
};

const readSection: ToolDefinition<'readSection'> = {
  name: 'readSection',
  description: 'Return what a section of the page is about.',
  async run({ sectionId }) {
    const meta = findSection(sectionId);
    if (!meta) return fail(`No section called “${sectionId}”.`);
    return ok(meta.synopsis, { sectionId, label: meta.label, synopsis: meta.synopsis });
  },
};

const listDestinations: ToolDefinition<'listDestinations'> = {
  name: 'listDestinations',
  description: 'List every curated journey with its region, season and length.',
  async run() {
    const rows = DESTINATIONS.map(
      (d) => `${d.name} (${d.region}) — ${d.season}, ${d.nights} nights`,
    );
    return ok(`Found ${rows.length} curated journeys.`, { rows });
  },
};

const describeDestination: ToolDefinition<'describeDestination'> = {
  name: 'describeDestination',
  description: 'Return the full description of one curated journey.',
  async run({ slug }) {
    const d = DESTINATIONS.find(
      (x) => x.slug === slug || x.name.toLowerCase() === slug.toLowerCase(),
    );
    if (!d) return fail(`We don’t currently curate a journey to “${slug}”.`);
    return ok(`${d.name} — ${d.region}, ${d.nights} nights (${d.season}).`, {
      name: d.name,
      region: d.region,
      nights: d.nights,
      season: d.season,
      blurb: d.blurb,
      slug: d.slug,
    });
  },
};

/** Shape a destination for synthesis — everything the reply might need. */
function summarise(d: Destination) {
  return {
    slug: d.slug,
    name: d.name,
    region: d.region,
    nights: d.nights,
    season: d.season,
    climate: d.climate,
    blurb: d.blurb,
    tags: [...d.tags],
  };
}

const filterDestinations: ToolDefinition<'filterDestinations'> = {
  name: 'filterDestinations',
  description:
    'Find journeys matching climate, length, month or theme. Use `extreme` for shortest/longest.',
  async run({ region, climate, maxNights, minNights, month, tag, extreme }) {
    let matches = DESTINATIONS.filter((d) => {
      if (region && d.region.toLowerCase() !== region.toLowerCase()) return false;
      if (climate && d.climate !== climate) return false;
      if (typeof maxNights === 'number' && d.nights > maxNights) return false;
      if (typeof minNights === 'number' && d.nights < minNights) return false;
      if (month && !d.months.includes(month.toLowerCase())) return false;
      if (tag && !d.tags.includes(tag.toLowerCase())) return false;
      return true;
    });

    if (extreme && matches.length) {
      const sorted = [...matches].sort((a, b) => a.nights - b.nights);
      matches = extreme === 'shortest' ? [sorted[0]!] : [sorted[sorted.length - 1]!];
    }

    if (!matches.length) {
      // Not an error — "nothing matches" is a real, useful answer.
      return ok('No journey matches those criteria.', {
        matches: [],
        criteria: { region, climate, maxNights, minNights, month, tag, extreme },
      });
    }

    return ok(
      `${matches.length} match${matches.length === 1 ? '' : 'es'}: ${matches.map((d) => d.name).join(', ')}.`,
      {
        matches: matches.map(summarise),
        criteria: { region, climate, maxNights, minNights, month, tag, extreme },
      },
    );
  },
};

const compareDestinations: ToolDefinition<'compareDestinations'> = {
  name: 'compareDestinations',
  description: 'Put two or more journeys side by side.',
  async run({ slugs }) {
    const found = slugs
      .map((s) => DESTINATIONS.find((d) => d.slug === s || d.name.toLowerCase() === s.toLowerCase()))
      .filter((d): d is Destination => Boolean(d));

    if (found.length < 2) return fail('I need two journeys I actually curate to compare.');

    return ok(`Compared ${found.map((d) => d.name).join(' and ')}.`, {
      comparison: found.map(summarise),
    });
  },
};

const similarDestinations: ToolDefinition<'similarDestinations'> = {
  name: 'similarDestinations',
  description: 'Find the journey closest in character to a given one.',
  async run({ slug }) {
    const seed = DESTINATIONS.find(
      (d) => d.slug === slug || d.name.toLowerCase() === slug.toLowerCase(),
    );
    if (!seed) return fail(`We don’t curate a journey to “${slug}”.`);

    const ranked = DESTINATIONS.filter((d) => d.slug !== seed.slug)
      .map((d) => ({
        destination: d,
        shared: d.tags.filter((t) => seed.tags.includes(t)),
        sameClimate: d.climate === seed.climate,
      }))
      .sort(
        (a, b) =>
          b.shared.length - a.shared.length ||
          Number(b.sameClimate) - Number(a.sameClimate),
      );

    const best = ranked[0];
    if (!best) return fail('Nothing to compare against.');

    return ok(`${best.destination.name} is the closest to ${seed.name}.`, {
      seed: summarise(seed),
      closest: summarise(best.destination),
      sharedTags: best.shared,
      sameClimate: best.sameClimate,
    });
  },
};

const enterExploreMode: ToolDefinition<'enterExploreMode'> = {
  name: 'enterExploreMode',
  description: 'Enter or leave the hero’s interactive 3D explore mode.',
  async run({ active }, ctx) {
    if (ctx.pathname !== '/') {
      ctx.navigate('/');
      await new Promise((r) => setTimeout(r, 420));
    }
    const hero = document.getElementById('hero');
    if (hero) {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? 'auto' : 'smooth' });
      await waitForScrollEnd(ctx.signal);
    }
    useUiStore.getState().setExploreMode(active);
    return ok(active ? 'Explore mode is live — drag the scene.' : 'Left explore mode.');
  },
};

const subscribeNewsletter: ToolDefinition<'subscribeNewsletter'> = {
  name: 'subscribeNewsletter',
  description: 'Fill the Quiet Letter form with an address. Never submits without confirmation.',
  requiresConfirmation: true,
  async run({ email, confirmed }) {
    // Awaiting confirmation is a *successful* outcome, not a failure — returning
    // `ok: false` here would read as a broken step and trigger a re-plan.
    if (!confirmed) {
      return ok(`Holding ${email} until you confirm.`, { email, staged: true });
    }

    const input = document.querySelector<HTMLInputElement>('#newsletter-email');
    if (!input) return fail('The Quiet Letter form isn’t on screen.');

    // React owns this input, so go through the native setter to make it notice.
    const setter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value',
    )?.set;
    setter?.call(input, email);
    input.dispatchEvent(new Event('input', { bubbles: true }));

    return ok(`Placed ${email} in the form — press Subscribe when you’re ready.`, { email });
  },
};

const respond: ToolDefinition<'respond'> = {
  name: 'respond',
  description: 'Say something back without touching the page.',
  async run({ text }) {
    return ok(text, { text });
  },
};

/* -------------------------------------------------------------------------- */
/*  Registry                                                                  */
/* -------------------------------------------------------------------------- */

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- heterogeneous map, narrowed by runTool
const REGISTRY: Record<ToolName, ToolDefinition<any>> = {
  scrollToSection,
  highlightElement,
  navigate,
  openPanel,
  closePanel,
  setTheme,
  triggerAnimation,
  readSection,
  listDestinations,
  describeDestination,
  filterDestinations,
  compareDestinations,
  similarDestinations,
  enterExploreMode,
  subscribeNewsletter,
  respond,
};

export function getTool<N extends ToolName>(name: N): ToolDefinition<N> | undefined {
  return REGISTRY[name] as ToolDefinition<N> | undefined;
}

export const TOOL_CATALOG = Object.values(REGISTRY).map((t) => ({
  name: t.name,
  description: t.description,
}));

export async function runTool<N extends ToolName>(
  name: N,
  args: ToolArgsMap[N],
  ctx: ToolContext,
): Promise<ToolResult> {
  const tool = getTool(name);
  if (!tool) return fail(`Unknown tool “${name}”.`);
  try {
    return await tool.run(args, ctx);
  } catch (err) {
    return fail(err instanceof Error ? err.message : 'The tool failed unexpectedly.');
  }
}

/** Human label for the trace UI. */
export const TOOL_LABELS: Record<ToolName, string> = {
  scrollToSection: 'scroll',
  highlightElement: 'highlight',
  navigate: 'navigate',
  openPanel: 'open',
  closePanel: 'close',
  setTheme: 'theme',
  triggerAnimation: 'animate',
  readSection: 'read',
  listDestinations: 'list',
  describeDestination: 'describe',
  filterDestinations: 'filter',
  compareDestinations: 'compare',
  similarDestinations: 'similar',
  enterExploreMode: 'explore',
  subscribeNewsletter: 'subscribe',
  respond: 'reply',
};

export { SECTIONS };
