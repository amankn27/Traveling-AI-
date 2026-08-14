'use client';

import type { Observation } from '@/types/agent';
import { markModelAvailable, markModelUnavailable, modelUnavailable } from './model-route';

/* -------------------------------------------------------------------------- */
/*  Narrow views of the structured payloads the knowledge tools return         */
/* -------------------------------------------------------------------------- */

interface DestinationView {
  slug: string;
  name: string;
  region: string;
  nights: number;
  season: string;
  climate: string;
  blurb: string;
  tags: string[];
}

interface FilterData {
  matches: DestinationView[];
  criteria: Record<string, unknown>;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : null;
}

const nights = (d: DestinationView) => `${d.nights} night${d.nights === 1 ? '' : 's'}`;

/** "A", "A and B", "A, B and C" — never "A and B and C". */
function joinList(items: string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

function criteriaPhrase(criteria: Record<string, unknown>): string {
  const parts: string[] = [];
  if (criteria.region) parts.push(`in ${String(criteria.region)}`);
  if (criteria.climate) parts.push(`somewhere ${String(criteria.climate)}`);
  if (typeof criteria.maxNights === 'number') parts.push(`${criteria.maxNights} nights or fewer`);
  if (typeof criteria.minNights === 'number') parts.push(`at least ${criteria.minNights} nights`);
  if (criteria.month) parts.push(`travelling in ${String(criteria.month)}`);
  if (criteria.tag) parts.push(`with ${String(criteria.tag)}`);
  return parts.join(', ');
}

/* -------------------------------------------------------------------------- */
/*  Local synthesis                                                           */
/* -------------------------------------------------------------------------- */

/**
 * Builds the reply from what the tools actually returned.
 *
 * This is the no-API-key path, and also the fallback whenever the model route is
 * unavailable — so the assistant can always answer from real observations
 * rather than from a string decided before it acted.
 */
export function templateReply(observations: Observation[]): string {
  const lines: string[] = [];

  for (const obs of observations) {
    const data = asRecord(obs.data);

    switch (obs.tool) {
      case 'filterDestinations': {
        const { matches, criteria } = (data ?? {}) as unknown as FilterData;
        const phrase = criteriaPhrase(criteria ?? {});

        if (!matches?.length) {
          lines.push(
            `Nothing in the atlas matches${phrase ? ` ${phrase}` : ' that'} — the collection is deliberately small. Tell me roughly what you're after and I'll find the nearest fit.`,
          );
          break;
        }

        if (criteria?.extreme) {
          const d = matches[0]!;
          const label = criteria.extreme === 'shortest' ? 'shortest' : 'longest';
          lines.push(
            `The ${label} is ${d.name} — ${d.region}, ${nights(d)}, timed for ${d.season.toLowerCase()}. ${d.blurb}`,
          );
          break;
        }

        if (matches.length === 1) {
          const d = matches[0]!;
          lines.push(
            `One journey fits${phrase ? ` ${phrase}` : ''}: ${d.name} — ${d.region}, ${nights(d)}, timed for ${d.season.toLowerCase()}. ${d.blurb}`,
          );
          break;
        }

        lines.push(
          `${matches.length} journeys fit${phrase ? ` ${phrase}` : ''}:\n\n${matches
            .map((d) => `· ${d.name} — ${d.region}, ${nights(d)} (${d.season})`)
            .join('\n')}`,
        );
        break;
      }

      case 'compareDestinations': {
        const comparison = (data?.comparison ?? []) as DestinationView[];
        if (comparison.length < 2) break;
        lines.push(
          `${joinList(comparison.map((d) => d.name))}, side by side:\n\n${comparison
            .map((d) => `· ${d.name} — ${d.region}, ${nights(d)}, ${d.season.toLowerCase()}, ${d.climate}. ${d.blurb}`)
            .join('\n\n')}`,
        );
        break;
      }

      case 'similarDestinations': {
        const seed = data?.seed as DestinationView | undefined;
        const closest = data?.closest as DestinationView | undefined;
        const shared = (data?.sharedTags ?? []) as string[];
        if (!seed || !closest) break;
        lines.push(
          `If ${seed.name} appeals, ${closest.name} is the closest in character — ${closest.region}, ${nights(closest)}, timed for ${closest.season.toLowerCase()}.${
            shared.length ? ` They share ${shared.slice(0, 3).join(', ')}.` : ''
          } ${closest.blurb}`,
        );
        break;
      }

      case 'describeDestination': {
        const d = data as unknown as DestinationView | null;
        if (!d?.name) break;
        lines.push(
          `${d.name} — ${d.region}, ${nights(d)}, timed for ${d.season.toLowerCase()}. ${d.blurb}`,
        );
        break;
      }

      case 'listDestinations': {
        const rows = (data?.rows ?? []) as string[];
        if (!rows.length) break;
        lines.push(
          `We curate ${rows.length} journeys right now:\n\n${rows.map((r) => `· ${r}`).join('\n')}\n\nAsk me about any one of them and I’ll take you to it.`,
        );
        break;
      }

      case 'readSection': {
        const label = data?.label as string | undefined;
        const synopsis = data?.synopsis as string | undefined;
        if (label && synopsis) lines.push(`${label}: ${synopsis}`);
        break;
      }

      default:
        break;
    }
  }

  return lines.join('\n\n').trim();
}

/* -------------------------------------------------------------------------- */
/*  Model-backed synthesis                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Streams a reply written from the tool results.
 *
 * Returns the full text, or `null` when the route is unavailable (no API key,
 * rate-limited, network error) so the caller can fall back to `templateReply`.
 */
export async function synthesiseWithModel(
  message: string,
  observations: Observation[],
  context: string,
  signal: AbortSignal,
  onToken: (chunk: string) => void,
): Promise<string | null> {
  if (modelUnavailable()) return null;

  try {
    const res = await fetch('/api/agent/respond', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context, observations }),
      signal,
    });

    if (res.status === 503) {
      markModelUnavailable();
      return null;
    }
    if (!res.ok || !res.body) return null;
    markModelAvailable();

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let full = '';

    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (signal.aborted) {
        await reader.cancel();
        break;
      }
      const chunk = decoder.decode(value, { stream: true });
      if (chunk) {
        full += chunk;
        onToken(chunk);
      }
    }

    return full.trim() ? full : null;
  } catch {
    return null;
  }
}
