import Anthropic from '@anthropic-ai/sdk';
import { NextResponse } from 'next/server';
import { clientKey, rateLimit, rateLimitHeaders } from '@/lib/rate-limit';

export const runtime = 'nodejs';

const LIMIT = 20;
const WINDOW_MS = 60_000;
const MAX_OBSERVATIONS = 8;

/**
 * Phase two of the agent loop: write the reply from what the tools returned.
 *
 * Streams plain text so the panel can render it as it arrives. Returns 503
 * without an API key so the client falls back to local templating.
 */

const SYSTEM = `You are the concierge for Veloria, a boutique travel studio.

You have just carried out some actions on the page and gathered results. Write the
reply to the reader, using ONLY the observations provided — they are the ground truth.

Rules:
- Never invent journeys, prices, dates, availability or details not in the observations.
- If the observations show no matches, say so plainly and offer to narrow it differently.
- Two or three sentences. Warm, unhurried, a little literary — this studio sells stillness.
- Write plain prose. No markdown headers, no bullet characters unless listing 3+ journeys.
- Don't describe the tools you ran or mention "observations"; just answer.`;

interface RespondBody {
  message?: unknown;
  context?: unknown;
  observations?: unknown;
}

export async function POST(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'synthesis_unavailable' }, { status: 503 });
  }

  const limit = rateLimit(`respond:${clientKey(request)}`, LIMIT, WINDOW_MS);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'rate_limited' },
      { status: 429, headers: rateLimitHeaders(limit, LIMIT) },
    );
  }

  let body: RespondBody;
  try {
    body = (await request.json()) as RespondBody;
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const message = typeof body.message === 'string' ? body.message.slice(0, 2000) : '';
  const context = typeof body.context === 'string' ? body.context.slice(0, 4000) : '';
  const observations = Array.isArray(body.observations)
    ? body.observations.slice(0, MAX_OBSERVATIONS)
    : [];

  if (!message.trim() || !observations.length) {
    return NextResponse.json({ error: 'nothing_to_synthesise' }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  const prompt = [
    context ? `Conversation so far:\n${context}\n` : '',
    `The reader said: ${message}`,
    '',
    'Observations gathered:',
    JSON.stringify(observations, null, 1).slice(0, 12_000),
  ]
    .filter(Boolean)
    .join('\n');

  try {
    const upstream = client.messages.stream({
      model: 'claude-opus-5',
      max_tokens: 1024,
      system: SYSTEM,
      // Short, grounded prose — low effort keeps it quick with thinking still on.
      output_config: { effort: 'low' },
      messages: [{ role: 'user', content: prompt }],
    });

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          for await (const event of upstream) {
            if (
              event.type === 'content_block_delta' &&
              event.delta.type === 'text_delta' &&
              event.delta.text
            ) {
              controller.enqueue(encoder.encode(event.delta.text));
            }
          }

          const final = await upstream.finalMessage();
          if (final.stop_reason === 'refusal') {
            controller.enqueue(encoder.encode('\n\nI can’t help with that one.'));
          }
        } catch (err) {
          console.error('[agent/respond] stream', err instanceof Error ? err.message : err);
          // Close cleanly — the client falls back to local templating on empty output.
        } finally {
          controller.close();
        }
      },
      cancel() {
        void upstream.abort();
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-store',
        ...rateLimitHeaders(limit, LIMIT),
      },
    });
  } catch (err) {
    const status = err instanceof Anthropic.APIError ? err.status : undefined;
    console.error('[agent/respond]', err instanceof Error ? err.message : err);
    return NextResponse.json({ error: 'synthesis_failed' }, { status: status ?? 502 });
  }
}
